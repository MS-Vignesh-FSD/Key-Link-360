import React, { useEffect, useRef, useState } from "react";
import { AppNotification, ScreenId } from "../types";
import {
  Bell,
  CheckCheck,
  X,
  Users,
  Globe,
  Sparkles,
  Send,
  Trash2,
  ArrowRight,
  FileEdit,
  Clock
} from "lucide-react";

interface NotificationPanelProps {
  notifications: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDeleteNotification?: (id: string) => void;
  onClearAllNotifications?: () => void;
  onNavigate: (screen: ScreenId, pageId?: string) => void;
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

type FilterCategory = "all" | "leads" | "pages" | "system";

export default function NotificationPanel({
  notifications,
  unreadCount,
  isOpen,
  onToggle,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onDeleteNotification,
  onClearAllNotifications,
  onNavigate
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<FilterCategory>("all");

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleItemClick = (notification: AppNotification) => {
    onMarkRead(notification.id);
    if (notification.targetScreen) {
      onNavigate(notification.targetScreen, notification.meta?.pageId);
      onClose();
    }
  };

  // Filter items based on active tab
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "leads") {
      return n.type === "contact_added";
    }
    if (filter === "pages") {
      return n.type === "page_published" || n.type === "draft_saved" || n.type === "page_created";
    }
    if (filter === "system") {
      return n.type === "domain_updated" || n.type === "campaign_status" || n.type === "general";
    }
    return true;
  });

  const leadCount = notifications.filter((n) => n.type === "contact_added").length;

  return (
    <div className="relative shrink-0" ref={panelRef}>
      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={onToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Activity & Updates"
      >
        <Bell className="h-5 w-5" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[19px] h-[19px] px-1 rounded-full bg-rose-500 border-2 border-[#131027] text-[10px] font-extrabold text-white flex items-center justify-center leading-none shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Panel Popover with SOLID NON-TRANSPARENT background */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[min(26rem,calc(100vw-1.5rem))] key-notification-panel rounded-2xl shadow-2xl z-50 overflow-hidden border border-purple-500/30 bg-[#131028] text-white flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Solid Header */}
          <div className="p-3.5 border-b border-purple-500/20 bg-[#181438] shrink-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center shadow-xs">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <span>Notifications</span>
                    {unreadCount > 0 ? (
                      <span className="text-[10px] text-amber-300 font-extrabold bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
                        {unreadCount} Unread
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-300 font-extrabold bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 rounded-md">
                        All Caught Up
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[#c4b5fd]">
                    Real-time leads, bio link activity, and domain status
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-purple-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/30 flex items-center gap-1 transition-all cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Read all</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-[#c4b5fd] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Clear Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#0c0a1a] p-1 rounded-xl border border-white/5">
              {[
                { id: "all" as const, label: "All" },
                { id: "leads" as const, label: leadCount > 0 ? `Leads (${leadCount})` : "Leads" },
                { id: "pages" as const, label: "Bio Pages" },
                { id: "system" as const, label: "System & Domain" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer truncate ${
                    filter === tab.id
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-[#c4b5fd] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Solid Scrollable List */}
          <div className="overflow-y-auto flex-1 divide-y divide-purple-500/15 bg-[#131028] no-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="py-14 px-6 text-center space-y-2 bg-[#131028]">
                <div className="h-10 w-10 rounded-2xl bg-purple-500/15 border border-purple-500/20 text-purple-300 flex items-center justify-center mx-auto">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-white">
                  No notifications in this tab
                </p>
                <p className="text-[11px] text-[#c4b5fd] leading-relaxed max-w-xs mx-auto">
                  New visitor leads, bio link updates, and domain connections will show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-purple-500/15 bg-[#131028]">
                {filteredNotifications.map((n) => {
                  const isLead = n.type === "contact_added";
                  const isPage = n.type === "page_published";
                  const isDraft = n.type === "draft_saved";
                  const isDomain = n.type === "domain_updated";
                  const isWhatsApp = n.type === "campaign_status";

                  return (
                    <li key={n.id} className="relative group">
                      <div
                        onClick={() => handleItemClick(n)}
                        className={`w-full text-left p-3.5 transition-all cursor-pointer flex flex-col gap-2 ${
                          !n.read
                            ? "bg-[#171333] hover:bg-[#201a45] border-l-2 border-l-purple-500"
                            : "bg-[#131028] hover:bg-[#1c173b]"
                        }`}
                      >
                        {/* Top Meta Bar */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Type Specific Badge */}
                            {isLead ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase tracking-wide bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <Users className="h-3 w-3" />
                                <span>New Lead</span>
                              </span>
                            ) : isPage ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase tracking-wide bg-purple-500/20 text-purple-300 border border-purple-500/35">
                                <Globe className="h-3 w-3" />
                                <span>Bio Link</span>
                              </span>
                            ) : isDraft ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase tracking-wide bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <FileEdit className="h-3 w-3" />
                                <span>Draft</span>
                              </span>
                            ) : isDomain ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase tracking-wide bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                <Sparkles className="h-3 w-3" />
                                <span>Domain</span>
                              </span>
                            ) : isWhatsApp ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase tracking-wide bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <Send className="h-3 w-3" />
                                <span>WhatsApp</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase tracking-wide bg-purple-500/15 text-purple-300 border border-purple-500/25">
                                <Clock className="h-3 w-3" />
                                <span>Update</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {!n.read && (
                              <span
                                className="h-2 w-2 rounded-full bg-purple-400 shrink-0 shadow-sm"
                                title="Unread"
                              />
                            )}
                            <span className="text-[10.5px] text-[#94a3b8] font-mono">
                              {formatTime(n.createdAt)}
                            </span>
                            {onDeleteNotification && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteNotification(n.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all ml-1 cursor-pointer"
                                title="Dismiss notification"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title & Message */}
                        <div>
                          <h4 className="text-[13px] font-bold text-white leading-snug">
                            {n.title}
                          </h4>
                          <p className="text-xs text-[#c4b5fd] mt-0.5 leading-relaxed font-normal">
                            {n.message}
                          </p>
                        </div>

                        {/* Action Link Button */}
                        {n.actionLabel && (
                          <div className="pt-0.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 text-purple-200 border border-purple-500/30 text-xs font-bold transition-all shadow-xs">
                              <span>{n.actionLabel}</span>
                              <ArrowRight className="h-3 w-3" />
                            </span>
                            <span className="text-[10px] text-[#94a3b8] font-mono">Click to open</span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Solid Footer with Clear All */}
          <div className="p-2.5 px-3.5 border-t border-purple-500/20 bg-[#181438] flex items-center justify-between text-xs text-[#c4b5fd] shrink-0">
            <span>{notifications.length} update{notifications.length === 1 ? "" : "s"}</span>
            {notifications.length > 0 && onClearAllNotifications && (
              <button
                type="button"
                onClick={onClearAllNotifications}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear all</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
