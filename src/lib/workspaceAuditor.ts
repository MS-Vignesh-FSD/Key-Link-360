import {
  AppNotification,
  BioPage,
  BioPageDraft,
  Contact,
  CustomDomain,
  QRCodeItem,
  ScreenId,
  TrackingPixel,
  WhatsAppCampaign
} from "../types";
import {
  CreateNotificationInput,
  createNotification,
  getDismissedNotificationIds
} from "../storage/notificationStorage";

export interface WorkspaceAuditContext {
  pages: BioPage[];
  savedDrafts?: BioPageDraft[];
  contacts?: Contact[];
  domains?: CustomDomain[];
  whatsAppCampaigns?: WhatsAppCampaign[];
  qrCodes?: QRCodeItem[];
  pixels?: TrackingPixel[];
}

/**
 * Audits the real workspace state and generates ONLY useful, realistic,
 * actionable notifications for real users of KeyLink360.
 *
 * Avoids robot filler, debug jargon ("before_build", "responsive layout active"),
 * and confusing fake IP addresses.
 */
export function auditWorkspaceTruth(
  context: WorkspaceAuditContext,
  existingNotifications: AppNotification[] = []
): AppNotification[] {
  const safeContext = context || {};
  const pages = Array.isArray(safeContext.pages) ? safeContext.pages : [];
  const contacts = Array.isArray(safeContext.contacts) ? safeContext.contacts : [];
  const domains = Array.isArray(safeContext.domains) ? safeContext.domains : [];

  const safeExisting = Array.isArray(existingNotifications) ? existingNotifications : [];
  const existingMap = new Map<string, AppNotification>();
  for (const n of safeExisting) {
    if (n && n.id) {
      existingMap.set(n.id, n);
    }
  }

  const dismissedIds = getDismissedNotificationIds();
  const truthfulInputs: CreateNotificationInput[] = [];

  // 1. RECENT LEADS (Highest value to user - up to 3 most recent leads)
  const recentContacts = contacts.slice(0, 3);
  for (const contact of recentContacts) {
    const id = `lead_notif_${contact.id}`;
    if (!dismissedIds.has(id)) {
      const emailOrPhone = contact.email || contact.phone || "Contact details saved";
      const pageInfo = contact.pageTitle || contact.sourceDomain || "Bio Link";
      truthfulInputs.push({
        id,
        type: "contact_added",
        status: "delivered",
        stage: "workspace_activity",
        title: `New Lead: ${contact.name}`,
        message: `${contact.name} submitted a lead form on "${pageInfo}" (${emailOrPhone}). Ready for follow-up.`,
        targetScreen: ScreenId.CONTACTS,
        actionLabel: "View in Contacts",
        meta: { contactId: contact.id },
        createdAt: contact.capturedAt
      });
    }
  }

  // 2. BIO PAGE TRAFFIC / ACTIVE STATUS (1 top highlight notification)
  const livePages = pages.filter((p) => p.status === "Live" && !p.isUncommitted);
  if (livePages.length > 0) {
    // Pick the most viewed or first live page
    const topPage = [...livePages].sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))[0];
    const pageNotifId = `page_live_${topPage.id}`;
    if (!dismissedIds.has(pageNotifId)) {
      const views = Number(topPage.views) || 0;
      truthfulInputs.push({
        id: pageNotifId,
        type: "page_published",
        status: "completed",
        stage: "workspace_activity",
        title: `Bio Link Active · ${topPage.title}`,
        message: `"${topPage.title}" is live at key.link/${topPage.slug} with ${views.toLocaleString()} view${views === 1 ? "" : "s"}. Share it on Instagram & WhatsApp.`,
        targetScreen: ScreenId.BIO_PAGES,
        actionLabel: "Open Bio Pages",
        meta: { pageId: topPage.id, slug: topPage.slug }
      });
    }
  }

  // 3. UNPUBLISHED DRAFT REMINDER (Only if user has unpublished drafts)
  const draftPages = pages.filter((p) => p.status === "Draft" || p.isUncommitted);
  if (draftPages.length > 0) {
    const draftPage = draftPages[0];
    const draftNotifId = `draft_ready_${draftPage.id}`;
    if (!dismissedIds.has(draftNotifId)) {
      truthfulInputs.push({
        id: draftNotifId,
        type: "draft_saved",
        status: "pending",
        stage: "workspace_activity",
        title: `Draft Ready to Publish`,
        message: `"${draftPage.title}" is currently saved as a draft. Publish it to start getting visitors and leads.`,
        targetScreen: ScreenId.BIO_PAGES,
        actionLabel: "Review & Publish",
        meta: { pageId: draftPage.id }
      });
    }
  }

  // 4. CUSTOM DOMAIN / BRAND URL STATUS (Useful and real)
  const verifiedDomain = domains.find(
    (d) => String(d.status || "").toLowerCase().includes("verif") || String(d.status || "").toLowerCase() === "active"
  );
  if (verifiedDomain) {
    const domainId = `domain_active_${verifiedDomain.id}`;
    if (!dismissedIds.has(domainId)) {
      truthfulInputs.push({
        id: domainId,
        type: "domain_updated",
        status: "completed",
        stage: "workspace_activity",
        title: `Custom Domain Verified`,
        message: `"${verifiedDomain.domain}" is verified and routing visitors with active SSL security.`,
        targetScreen: ScreenId.CUSTOM_DOMAINS,
        actionLabel: "Manage Domains",
        meta: { domainId: verifiedDomain.id }
      });
    }
  } else if (!dismissedIds.has("domain_brand_tip")) {
    // If no custom domain yet, give 1 helpful brand tip
    truthfulInputs.push({
      id: "domain_brand_tip",
      type: "domain_updated",
      status: "completed",
      stage: "workspace_activity",
      title: `Connect Your Custom Domain`,
      message: `Use your own brand name (e.g. links.yourbrand.com) on KeyLink360 to build trust and increase click rates.`,
      targetScreen: ScreenId.CUSTOM_DOMAINS,
      actionLabel: "Connect Domain"
    });
  }

  // 5. WHATSAPP AUTO-RESPONDER TIP (1 helpful automation notification)
  if (!dismissedIds.has("whatsapp_automation_ready")) {
    truthfulInputs.push({
      id: "whatsapp_automation_ready",
      type: "campaign_status",
      status: "upcoming",
      stage: "workspace_activity",
      title: `WhatsApp Lead Automation Ready`,
      message: `Set up automated WhatsApp greetings so leads get an instant response right after submitting their info.`,
      targetScreen: ScreenId.WHATSAPP,
      actionLabel: "Setup WhatsApp"
    });
  }

  // Merge with existing user notifications preserving user actions (reads, timestamps)
  const auditedNotifications: AppNotification[] = [];
  const processedIds = new Set<string>();

  for (const input of truthfulInputs) {
    if (!input.id) continue;
    processedIds.add(input.id);
    const existing = existingMap.get(input.id);

    if (existing) {
      auditedNotifications.push({
        ...existing,
        status: input.status,
        title: input.title,
        message: input.message,
        actionLabel: input.actionLabel,
        meta: input.meta
      });
    } else {
      auditedNotifications.push(createNotification(input));
    }
  }

  // Keep any manually created session notifications (as long as not dismissed and not legacy robotic noise)
  for (const n of existingNotifications) {
    if (
      !processedIds.has(n.id) &&
      !dismissedIds.has(n.id) &&
      !n.id.startsWith("truth_") &&
      !n.message?.includes("76.76.21.21") &&
      !n.message?.includes("Responsive layout active")
    ) {
      auditedNotifications.push(n);
    }
  }

  // Sort by createdAt descending
  return auditedNotifications.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime() || 0;
    const timeB = new Date(b.createdAt).getTime() || 0;
    return timeB - timeA;
  });
}
