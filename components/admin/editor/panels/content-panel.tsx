"use client";

import { MESSAGE_LABEL } from "@/lib/services/card-utils";
import type { MessageChannel } from "@/lib/types";
import { validateEmail, validatePhone, validateRequired, validateUrl, type Validation } from "@/lib/validate";
import { getTemplate } from "@/templates/registry";
import { Segmented } from "@/components/ui/controls";
import { BrandIcon } from "@/components/card/brand-icons";
import { useEditor } from "../editor-context";
import { BoundField, Divider, PanelHeader } from "../fields";
import { Block, ListEditor, shownBy } from "./details-panel";

const CHANNELS: MessageChannel[] = ["sms", "whatsapp", "viber", "messenger"];

export function ContentPanel() {
  const { card, patch } = useEditor();
  const needsTarget = card.messageChannel === "messenger";
  const tpl = getTemplate(card.templateId);

  return (
    <div>
      <PanelHeader title="Content" description="Leave a field empty and it hides on the public card." />

      <div className="flex flex-col gap-5">
        <BoundField
          fieldKey="name"
          label="Name"
          value={card.name}
          validate={(v) => validateRequired(v, "Name")}
          onCommit={(v) => patch({ name: v })}
          autoComplete="off"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <BoundField fieldKey="title" label="Title or position" optional value={card.title ?? ""} onCommit={(v) => patch({ title: v || undefined })} placeholder="Operations Manager" />
          <BoundField fieldKey="company" label="Company" optional value={card.company ?? ""} onCommit={(v) => patch({ company: v || undefined })} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <BoundField fieldKey="eyebrow" label="Tag above your name" optional value={card.eyebrow ?? ""} onCommit={(v) => patch({ eyebrow: v || undefined })} max={40} placeholder="Fractional Executive Support" hint={`A short pill above the name. Shown by ${shownBy("taglines")}.`} />
          <BoundField fieldKey="tagline" label="Line under the logo" optional value={card.tagline ?? ""} onCommit={(v) => patch({ tagline: v || undefined })} max={40} placeholder="Fractional Executive Services" hint={`Your company’s tagline. Shown by ${shownBy("taglines")}.`} />
        </div>
        <BoundField
          fieldKey="credential"
          label="Licence or registration"
          optional
          value={card.credential ?? ""}
          onCommit={(v) => patch({ credential: v || undefined })}
          placeholder="PRC REB No. 0004127"
          hint="Printed small by Keepsake, Folio and Split Hero, e.g. a PRC or DTI number."
        />
        <BoundField
          fieldKey="quote"
          label="Quote"
          optional
          multiline
          rows={2}
          max={140}
          value={card.quote ?? ""}
          onCommit={(v) => patch({ quote: v || undefined })}
          hint="One line in their own words. Shown large, as a pull quote."
        />
        <BoundField
          fieldKey="description"
          label="About"
          optional
          multiline
          rows={6}
          max={900}
          value={card.description ?? ""}
          onCommit={(v) => patch({ description: v || undefined })}
          hint="Leave a blank line between paragraphs. Long text gets a Read more link."
        />
      </div>

      <Divider />

      <div className="flex flex-col gap-5">
        <h3 className="text-base font-semibold">Contact</h3>
        <BoundField
          fieldKey="phone"
          label="Mobile number"
          optional
          value={card.phone ?? ""}
          validate={validatePhone}
          onCommit={(v) => patch({ phone: v || undefined })}
          inputMode="tel"
          placeholder="+63 917 555 0142"
          hint="The Call button dials this number."
        />
        <div className="flex flex-col gap-2">
          <span id="msg-label" className="text-sm font-semibold">
            Message button opens
          </span>
          <Segmented<MessageChannel>
            label="Message button opens"
            value={card.messageChannel}
            onChange={(v) => patch({ messageChannel: v })}
            className="w-full"
            options={CHANNELS.map((c) => ({
              value: c,
              label: c === "sms" ? "SMS" : MESSAGE_LABEL[c],
              icon: c === "sms" ? undefined : <BrandIcon platform={c} className="size-3.5" />,
            }))}
          />
        </div>
        {card.messageChannel !== "sms" && (
          <BoundField
            key={card.messageChannel}
            fieldKey="messageTarget"
            label={needsTarget ? "Messenger username" : `${MESSAGE_LABEL[card.messageChannel]} number`}
            optional={!needsTarget}
            value={card.messageTarget ?? ""}
            validate={
              needsTarget
                ? (v): Validation =>
                    !v.trim()
                      ? { ok: false, message: "Add the page or profile username, the part after m.me/." }
                      : /^[\w.]+$/.test(v.trim())
                        ? { ok: true, value: v.trim() }
                        : { ok: false, message: "Use the username only, like kapehansacallereal." }
                : validatePhone
            }
            onCommit={(v) => patch({ messageTarget: v || undefined })}
            placeholder={needsTarget ? "yourpagename" : "Same as the mobile number"}
            hint={needsTarget ? "Opens m.me/username." : "Leave empty to use the mobile number."}
          />
        )}
        <BoundField
          fieldKey="email"
          label="Email"
          optional
          value={card.email ?? ""}
          validate={validateEmail}
          onCommit={(v) => patch({ email: v || undefined })}
          type="email"
          placeholder="name@company.ph"
          hint="Visitors can tap to email or copy the address."
        />
        <BoundField
          fieldKey="address"
          label="Address"
          optional
          multiline
          rows={2}
          value={card.address ?? ""}
          onCommit={(v) => patch({ address: v || undefined })}
          hint="Shown with the map. Set the pin and directions in Map."
        />
      </div>

      <Divider />

      <div className="flex flex-col gap-8">
        <Block title="Booking button" support="booking" tpl={tpl} description="Where the booking button goes, like a Calendly page. Without a link, the button opens your messages instead.">
          <BoundField fieldKey="bookingUrl" label="Booking page" optional value={card.bookingUrl ?? ""} onCommit={(v) => patch({ bookingUrl: v || undefined })} validate={(v) => (v ? validateUrl(v) : { ok: true, value: "" })} placeholder="https://" inputMode="url" />
          <div className="grid gap-5 sm:grid-cols-2">
            <BoundField fieldKey="bookingLabel" label="Button label" optional value={card.bookingLabel ?? ""} onCommit={(v) => patch({ bookingLabel: v || undefined })} max={32} placeholder="Book a Strategy Call" />
            <BoundField fieldKey="bookingNote" label="Sub-line" optional value={card.bookingNote ?? ""} onCommit={(v) => patch({ bookingNote: v || undefined })} max={40} placeholder="30 min · No commitment" />
          </div>
          <p className="text-2xs text-studio-ink-3">
            The label and sub-line show on {shownBy("bookingCta")}. Left empty, they read “Book a Strategy Call” and “30 min · No commitment”. With your own label, the sub-line shows only if you write one.
          </p>
        </Block>

        <Block title="Industries & expertise" support="expertiseChips" tpl={tpl} description="Short names shown as chips, in this order. Drag to reorder.">
          <ListEditor label="Expertise" sortable values={card.expertiseChips ?? []} onChange={(v) => patch({ expertiseChips: v.length ? v : undefined })} placeholder="e.g. Medical Outsourcing" />
        </Block>
      </div>
    </div>
  );
}
