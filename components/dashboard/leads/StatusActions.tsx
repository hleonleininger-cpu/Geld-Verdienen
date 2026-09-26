"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { MessageSquareText, FileText, BellPlus, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { updateLeadStatus, type LeadActionState } from "@/app/dashboard/leads/actions";

function StatusButton({
  leadId,
  status,
  variant,
  icon: Icon,
  children,
}: {
  leadId: string;
  status: "won" | "lost";
  variant: "secondary" | "danger";
  icon: typeof ThumbsUp;
  children: React.ReactNode;
}) {
  const initialState: LeadActionState = null;
  const [, formAction] = useActionState(updateLeadStatus, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="status" value={status} />
      <SubmitStatusButton variant={variant} icon={Icon}>
        {children}
      </SubmitStatusButton>
    </form>
  );
}

function SubmitStatusButton({
  variant,
  icon: Icon,
  children,
}: {
  variant: "secondary" | "danger";
  icon: typeof ThumbsUp;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      <Icon className="h-4 w-4" />
      {children}
    </Button>
  );
}

export function StatusActions({ leadId }: { leadId: string }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <ButtonLink href="#antwort" variant="outline">
        <MessageSquareText className="h-4 w-4" />
        Antwort erstellen
      </ButtonLink>
      <ButtonLink href="#angebot" variant="outline">
        <FileText className="h-4 w-4" />
        Angebot erstellen
      </ButtonLink>
      <ButtonLink href="#erinnerung" variant="outline">
        <BellPlus className="h-4 w-4" />
        Erinnerung setzen
      </ButtonLink>
      <StatusButton leadId={leadId} status="won" variant="secondary" icon={ThumbsUp}>
        Als gewonnen markieren
      </StatusButton>
      <StatusButton leadId={leadId} status="lost" variant="danger" icon={ThumbsDown}>
        Als verloren markieren
      </StatusButton>
    </div>
  );
}
