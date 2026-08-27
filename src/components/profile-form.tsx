"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIAS, CONTRACT_TYPES, JOURNADAS, REGIONES } from "@/lib/constants";
import { MultiCheckList } from "@/components/multi-check-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ClientProfile } from "@/lib/types";

interface ProfileFormProps {
  /** Pre-fill values when editing an existing profile. */
  initialProfile?: ClientProfile | null;
  submitLabel: string;
  /** Called after a successful save. */
  onSaved?: () => void;
}

/**
 * Shared profile editor used by both the first-run onboarding flow and the
 * post-onboarding /preferences page. Writes the same `ClientProfile` shape via
 * setDoc merge so the matching engine reads a single canonical profile.
 */
export function ProfileForm({ initialProfile, submitLabel, onSaved }: ProfileFormProps) {
  const { user } = useAuth();

  const [regiones, setRegiones] = useState<string[]>(initialProfile?.regiones ?? []);
  const [comunas, setComunas] = useState((initialProfile?.comunas ?? []).join(", "));
  const [categorias, setCategorias] = useState<string[]>(initialProfile?.categorias ?? []);
  const [contractTypes, setContractTypes] = useState<string[]>(
    initialProfile?.contract_types ?? []
  );
  const [journadaPref, setJournadaPref] = useState<string>(initialProfile?.journada_pref ?? "");
  const [salaryMin, setSalaryMin] = useState(
    initialProfile?.salary_expectation_min != null
      ? String(initialProfile.salary_expectation_min)
      : ""
  );
  const [skills, setSkills] = useState((initialProfile?.skills ?? []).join(", "));
  const [resumen, setResumen] = useState(initialProfile?.resumen ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (
      regiones.length === 0 ||
      categorias.length === 0 ||
      contractTypes.length === 0 ||
      !resumen.trim()
    ) {
      toast.error("Completa los campos obligatorios: regiones, categorías, tipo de contrato y resumen.");
      return;
    }
    setSubmitting(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          profile: {
            regiones,
            comunas: comunas
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean),
            categorias,
            contract_types: contractTypes,
            journada_pref: journadaPref || null,
            salary_expectation_min: salaryMin ? Number(salaryMin) : null,
            skills: skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            resumen: resumen.trim(),
          },
        },
        { merge: true }
      );
      onSaved?.();
    } catch {
      toast.error("No pudimos guardar tu perfil. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label className="text-brand-navy">Regiones de interés *</Label>
        <MultiCheckList options={REGIONES} selected={regiones} onChange={setRegiones} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="comunas" className="text-brand-navy">
          Comunas de preferencia (opcional)
        </Label>
        <Input
          id="comunas"
          placeholder="Ej: Providencia, Ñuñoa"
          value={comunas}
          onChange={(e) => setComunas(e.target.value)}
        />
        <p className="text-xs text-brand-navy/50">Separa cada comuna con una coma.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-brand-navy">Categorías de interés *</Label>
        <MultiCheckList options={CATEGORIAS} selected={categorias} onChange={setCategorias} />
      </div>

      <div className="space-y-2">
        <Label className="text-brand-navy">Tipo de contrato preferido *</Label>
        <MultiCheckList options={CONTRACT_TYPES} selected={contractTypes} onChange={setContractTypes} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="journada" className="text-brand-navy">
            Jornada preferida (opcional)
          </Label>
          <Select value={journadaPref} onValueChange={(value) => setJournadaPref(value ?? "")}>
            <SelectTrigger id="journada" className="w-full">
              <SelectValue placeholder="Selecciona una jornada" />
            </SelectTrigger>
            <SelectContent>
              {JOURNADAS.map((j) => (
                <SelectItem key={j} value={j}>
                  {j}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary" className="text-brand-navy">
            Sueldo mínimo esperado en CLP (opcional)
          </Label>
          <Input
            id="salary"
            type="number"
            min={0}
            placeholder="Ej: 800000"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="skills" className="text-brand-navy">
          Habilidades / palabras clave (opcional)
        </Label>
        <Input
          id="skills"
          placeholder="Ej: Excel, atención al cliente, SAP"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />
        <p className="text-xs text-brand-navy/50">Separa cada habilidad con una coma.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="resumen" className="text-brand-navy">
          Resumen profesional *
        </Label>
        <Textarea
          id="resumen"
          rows={4}
          required
          value={resumen}
          onChange={(e) => setResumen(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
