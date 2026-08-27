"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { approveCv, hasUploadedCv, requestCvChanges, submitCv } from "@/lib/cv";
import { CV_STATUS_LABELS, CV_STATUSES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CvDropzone } from "@/components/cv-dropzone";
import { History, Mail } from "lucide-react";
import { toast } from "sonner";

export default function CvPage() {
  const { user, userDoc } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user || !userDoc) return null;
  const cv = userDoc.cv;

  async function handleSubmit() {
    if (!file || !user) return;
    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      await submitCv(idToken, file);
      toast.success(
        "Recibimos tu CV. Nuestro equipo te enviará una versión mejorada a tu correo en menos de 24 horas."
      );
      setFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos enviar tu CV. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!user) return;
    setSubmitting(true);
    try {
      await approveCv(user.uid);
      toast.success("CV aprobado. Ya puedes postular a empleos.");
    } catch {
      toast.error("No pudimos aprobar tu CV.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestChanges() {
    if (!user) return;
    setSubmitting(true);
    try {
      await requestCvChanges(user.uid, note);
      toast.success("Enviamos tu solicitud de cambios al equipo.");
      setNote("");
    } catch {
      toast.error("No pudimos enviar tu solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="eyebrow mb-1">✦ Tu carta de presentación</p>
        <h1 className="text-3xl font-black tracking-tight text-brand-navy">Mi CV</h1>
        <p className="mt-1 text-sm text-brand-navy/60">
          Sube tu CV original en PDF. Nuestro equipo te envía una versión mejorada a tu correo
          en menos de 24 horas para que la revises y apruebes.
        </p>
      </div>

      <Card className="border-2 border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-extrabold text-brand-navy">Estado actual</CardTitle>
          <Badge variant={hasUploadedCv(cv) ? "accent" : "secondary"}>
            {hasUploadedCv(cv) ? CV_STATUS_LABELS[cv.status] : "Aún no subes tu CV"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasUploadedCv(cv) && (
            <p className="text-sm text-brand-navy/70">
              Sube tu CV en PDF aquí abajo. El equipo lo mejora y te lo envía por correo para que
              lo apruebes — lo necesitas aprobado para postular.
            </p>
          )}

          {hasUploadedCv(cv) && cv.status === CV_STATUSES.PENDIENTE_MEJORA && (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-brand-paleblue bg-brand-paleblue/20 p-4">
              <Mail className="mt-0.5 size-5 shrink-0 text-brand-coral" />
              <p className="text-sm text-brand-navy/80">
                Recibimos tu CV (v{cv.version}). Nuestro equipo lo está mejorando y te enviará la
                nueva versión a tu correo en menos de 24 horas.
              </p>
            </div>
          )}

          {cv.status === CV_STATUSES.MEJORADO_POR_REVISAR && (
            <div className="space-y-3 rounded-2xl border-2 border-brand-paleblue bg-brand-paleblue/20 p-4">
              <p className="text-sm font-bold text-brand-navy">
                Te enviamos tu CV mejorado a tu correo. Revísalo y decide si lo apruebas o
                solicitas cambios.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleApprove} disabled={submitting}>
                  Aprobar
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note" className="text-brand-navy">
                  Comentario para solicitar cambios (opcional)
                </Label>
                <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRequestChanges}
                  disabled={submitting}
                >
                  Solicitar cambios
                </Button>
              </div>
            </div>
          )}

          {cv.status === CV_STATUSES.CAMBIOS_SOLICITADOS && (
            <p className="text-sm text-brand-navy/70">
              Enviamos tu solicitud de cambios al equipo. Te llegará una nueva versión a tu correo.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-brand-navy">
            {cv.version === 0 ? "Sube tu CV" : "Enviar una nueva versión"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CvDropzone file={file} onFileSelected={setFile} disabled={submitting} />

          <Button onClick={handleSubmit} disabled={!file || submitting}>
            {submitting ? "Enviando…" : "Enviar CV"}
          </Button>
          <p className="text-xs text-brand-navy/50">
            Tu CV llega directo a nuestro equipo. No lo publicamos ni lo compartimos con nadie más.
          </p>
        </CardContent>
      </Card>

      {cv.history.length > 0 && (
        <Card className="border-2 border-border">
          <CardHeader className="flex flex-row items-center gap-2">
            <History className="size-5 text-brand-coral" />
            <CardTitle className="text-base font-extrabold text-brand-navy">
              Historial de versiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {[...cv.history]
                .sort((a, b) => b.version - a.version)
                .map((entry) => (
                  <li
                    key={`${entry.version}-${entry.uploadedBy}`}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-bold text-brand-navy">Versión {entry.version}</p>
                      <p className="text-xs text-brand-navy/50">
                        {entry.uploadedBy === "team" ? "Mejorado por el equipo" : "Enviado por ti"}
                        {entry.uploadedAt?.toDate
                          ? ` · ${entry.uploadedAt.toDate().toLocaleDateString("es-CL")}`
                          : ""}
                      </p>
                    </div>
                  </li>
                ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
