"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Bell, CalendarDays, Check, CheckCircle2, CircleAlert, Clock3, Megaphone,
  FileText, Link2, MessageSquare, Plus, RefreshCw, Send, ShieldCheck,
  Users, Video, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Profile = { user_id: string; email: string; display_name: string | null; role: string; is_active: boolean; department?: string | null; job_title?: string | null; phone?: string | null };
type StaffTask = { id: string; title: string; description: string; assigned_to_user_id: string | null; assigned_department: string | null; due_at: string | null; priority: "normal" | "urgent"; status: string; completion_notes: string | null; review_note: string | null; assigned_at: string; created_at: string };
type Meeting = { id: string; title: string; meeting_type: string; visibility: string; agenda: string; meeting_url: string | null; starts_at: string; ends_at: string | null; is_recurring: boolean; recurrence_rule: string | null; status: string; discussion_notes: string | null; decisions: string | null; action_points: string | null };
type Announcement = { id: string; title: string; body: string; importance: string; published_at: string };
type Comment = { id: string; task_id: string; user_id: string; comment: string; created_at: string };
type Extension = { id: string; task_id: string; requested_by: string; requested_due_at: string; reason: string; status: string; reviewer_note: string | null; created_at: string };
type Notification = { id: string; title: string; body: string; notification_type: string; read_at: string | null; created_at: string };
type Tab = "overview" | "meetings" | "tasks" | "announcements";

const departments = ["Operations & Production", "Sales & Customer Relations", "Finance & Accounts", "Marketing & Growth", "Procurement & Supply", "Administration & Human Resources"];
const dateTime = (value: string) => new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const toLocalInput = (value: string) => { const date = new Date(value); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); };
const statusLabel = (status: string) => ({ pending: "Pending", accepted: "Accepted", in_progress: "In Progress", submitted_for_review: "Submitted for Review", completed: "Completed", cancelled: "Cancelled" }[status] || status);
const typeLabel = (type: string) => ({ management: "Management meeting", general_staff: "General staff meeting", training: "Training session", special: "Special meeting" }[type] || type);

export default function StaffActivitiesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [completionDrafts, setCompletionDrafts] = useState<Record<string, string>>({});
  const [extensionDrafts, setExtensionDrafts] = useState<Record<string, { date: string; reason: string }>>({});
  const [meetingDrafts, setMeetingDrafts] = useState<Record<string, { starts_at: string; meeting_url: string; status: string; agenda: string; discussion_notes: string; decisions: string; action_points: string }>>({});

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingType, setMeetingType] = useState("general_staff");
  const [meetingVisibility, setMeetingVisibility] = useState("company");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingEnd, setMeetingEnd] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingParticipants, setMeetingParticipants] = useState<string[]>([]);
  const [meetingRepeat, setMeetingRepeat] = useState("none");
  const [meetingRepeatUntil, setMeetingRepeatUntil] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDepartment, setTaskDepartment] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskPriority, setTaskPriority] = useState("normal");

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementImportance, setAnnouncementImportance] = useState("normal");

  const isOwner = profile?.role === "owner";

  const load = useCallback(async () => {
    if (!supabase) { setError("Database connection is not configured."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Please sign in through the admin dashboard."); setLoading(false); return; }
    const { data: current, error: profileError } = await supabase.from("admin_profiles")
      .select("user_id,email,display_name,role,is_active,department,job_title,phone")
      .eq("user_id", user.id).maybeSingle();
    if (profileError || !current?.is_active) { setError("Your account does not have active eCuisine staff access."); setLoading(false); return; }
    setProfile(current as Profile);
    const [taskResult, meetingResult, announcementResult, notificationResult, participantResult, ackResult, staffResult, commentResult, extensionResult] = await Promise.all([
      supabase.from("staff_tasks").select("*").order("due_at", { ascending: true, nullsFirst: false }).limit(300),
      supabase.from("staff_meetings").select("*").order("starts_at", { ascending: true }).limit(200),
      supabase.from("staff_announcements").select("*").order("published_at", { ascending: false }).limit(100),
      supabase.from("staff_dashboard_notifications").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("staff_meeting_participants").select("meeting_id,attendance").eq("user_id", user.id),
      supabase.from("staff_announcement_acknowledgements").select("announcement_id").eq("user_id", user.id),
      current.role === "owner" ? supabase.from("admin_profiles").select("user_id,email,display_name,role,is_active,department,job_title,phone").eq("is_active", true).order("display_name") : Promise.resolve({ data: [], error: null }),
      supabase.from("staff_task_comments").select("*").order("created_at", { ascending: true }).limit(500),
      supabase.from("staff_task_extension_requests").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (taskResult.error) setError(taskResult.error.message);
    else setTasks((taskResult.data || []) as StaffTask[]);
    if (meetingResult.error) setError(meetingResult.error.message);
    else setMeetings((meetingResult.data || []) as Meeting[]);
    if (announcementResult.error) setError(announcementResult.error.message);
    else setAnnouncements((announcementResult.data || []) as Announcement[]);
    if (notificationResult.error) setError(notificationResult.error.message);
    else setNotifications((notificationResult.data || []) as Notification[]);
    setAttendance(Object.fromEntries((participantResult.data || []).map((row: {meeting_id:string;attendance:string}) => [row.meeting_id, row.attendance])));
    setAcknowledged((ackResult.data || []).map((row: {announcement_id:string}) => row.announcement_id));
    setStaff((staffResult.data || []) as Profile[]);
    setComments((commentResult.data || []) as Comment[]);
    setExtensions((extensionResult.data || []) as Extension[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleTasks = useMemo(() => tasks.filter(task => isOwner || task.assigned_to_user_id === profile?.user_id), [tasks, isOwner, profile?.user_id]);
  const overdueCount = visibleTasks.filter(task => task.due_at && new Date(task.due_at) < new Date() && !["completed","cancelled"].includes(task.status)).length;
  const pendingCount = visibleTasks.filter(task => !["completed","cancelled"].includes(task.status)).length;
  const upcomingMeetings = meetings.filter(meeting => meeting.status === "scheduled" && new Date(meeting.starts_at) >= new Date()).slice(0, 5);
  const unreadNotifications = notifications.filter(item => !item.read_at).length;
  const staffName = (id: string | null) => staff.find(member => member.user_id === id)?.display_name || staff.find(member => member.user_id === id)?.email || "Unassigned";
  const isOverdue = (task: StaffTask) => Boolean(task.due_at && new Date(task.due_at) < new Date() && !["completed","cancelled"].includes(task.status));

  async function notifyUser(userId: string, title: string, body: string, relatedType: string, relatedId: string) {
    if (!supabase) return;
    await supabase.from("staff_dashboard_notifications").insert({ user_id: userId, title, body, notification_type: relatedType, related_type: relatedType, related_id: relatedId });
  }
  async function createMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !isOwner) return;
    if (meetingVisibility === "invited" && meetingParticipants.length === 0) { setError("Select at least one participant for an invitation-only meeting."); return; }
    setSaving(true); setError(""); setNotice("");
    const startsAt = new Date(meetingDate).toISOString();
    const endsAt = meetingEnd ? new Date(meetingEnd).toISOString() : null;
    if (endsAt && new Date(endsAt) <= new Date(startsAt)) { setError("Meeting end time must be after its start time."); setSaving(false); return; }
    const { data, error: insertError } = await supabase.from("staff_meetings").insert({
      title: meetingTitle.trim(), meeting_type: meetingType, visibility: meetingVisibility, agenda: meetingAgenda.trim(),
      meeting_url: meetingUrl.trim() || null, starts_at: startsAt, ends_at: endsAt,
      is_recurring: meetingRepeat !== "none", recurrence_rule: meetingRepeat === "none" ? null : meetingRepeat,
      recurrence_until: meetingRepeatUntil || null, created_by: profile.user_id,
    }).select("id").single();
    if (insertError) setError(insertError.message);
    else {
      const id = data.id as string;
      const recipients = meetingVisibility === "company" ? staff.map(member => member.user_id) : meetingParticipants;
      if (meetingVisibility === "invited" && meetingParticipants.length) {
        const { error: participantError } = await supabase.from("staff_meeting_participants").insert(meetingParticipants.map(user_id => ({ meeting_id: id, user_id })));
        if (participantError) setError(participantError.message);
      }
      await Promise.all(recipients.filter(userId => userId !== profile.user_id).map(userId => notifyUser(userId, "New meeting: " + meetingTitle.trim(), "A meeting has been scheduled for " + dateTime(startsAt) + ". Open Staff Activities to view the agenda and meeting link.", "meeting", id)));
      setNotice("Meeting scheduled. Dashboard notifications have been created for the selected staff.");
      setShowMeetingForm(false); setMeetingTitle(""); setMeetingAgenda(""); setMeetingUrl(""); setMeetingDate(""); setMeetingEnd(""); setMeetingParticipants([]); setMeetingRepeat("none"); setMeetingRepeatUntil("");
      await load();
    }
    setSaving(false);
  }
  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !isOwner) return;
    if (!taskAssignee && !taskDepartment) { setError("Select a staff member or department for this task."); return; }
    setSaving(true); setError(""); setNotice("");
    const { data, error: insertError } = await supabase.from("staff_tasks").insert({
      title: taskTitle.trim(), description: taskDescription.trim(), assigned_to_user_id: taskAssignee || null,
      assigned_department: taskDepartment || null, assigned_by: profile.user_id,
      due_at: taskDue ? new Date(taskDue).toISOString() : null, priority: taskPriority,
    }).select("id").single();
    if (insertError) setError(insertError.message);
    else {
      if (taskAssignee) await notifyUser(taskAssignee, "New task assigned: " + taskTitle.trim(), "A new task has been assigned to you. Deadline: " + (taskDue ? dateTime(new Date(taskDue).toISOString()) : "Not specified") + ".", "task", data.id);
      setNotice(taskAssignee ? "Task assigned and a dashboard notification was created." : "Department task recorded. It will remain in the management view until individual assignment is configured.");
      setShowTaskForm(false); setTaskTitle(""); setTaskDescription(""); setTaskAssignee(""); setTaskDepartment(""); setTaskDue(""); setTaskPriority("normal");
      await load();
    }
    setSaving(false);
  }
  async function createAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !isOwner) return;
    setSaving(true); setError(""); setNotice("");
    const { data, error: insertError } = await supabase.from("staff_announcements").insert({
      title: announcementTitle.trim(), body: announcementBody.trim(), importance: announcementImportance, created_by: profile.user_id,
    }).select("id").single();
    if (insertError) setError(insertError.message);
    else {
      await Promise.all(staff.filter(member => member.user_id !== profile.user_id).map(member => notifyUser(member.user_id, "Company announcement: " + announcementTitle.trim(), announcementBody.trim().slice(0, 220), "announcement", data.id)));
      setNotice("Announcement published. Staff dashboard notifications have been created.");
      setShowAnnouncementForm(false); setAnnouncementTitle(""); setAnnouncementBody(""); setAnnouncementImportance("normal");
      await load();
    }
    setSaving(false);
  }
  async function changeTaskStatus(task: StaffTask, status: string) {
    if (!supabase || !profile) return;
    setSaving(true); setError(""); setNotice("");
    const allowed = isOwner || ["accepted","in_progress","submitted_for_review"].includes(status);
    if (!allowed) { setSaving(false); return; }
    const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "submitted_for_review") { payload.submitted_at = new Date().toISOString(); payload.completion_notes = completionDrafts[task.id] || ""; }
    if (isOwner && status === "completed") { payload.reviewed_at = new Date().toISOString(); payload.reviewed_by = profile.user_id; }
    if (isOwner && status === "in_progress") { payload.review_note = completionDrafts[task.id] || "Please revise and resubmit this task."; }
    const { error: updateError } = await supabase.from("staff_tasks").update(payload).eq("id", task.id);
    if (updateError) setError(updateError.message);
    else {
      if (task.assigned_to_user_id && (status === "completed" || status === "in_progress")) {
        await notifyUser(task.assigned_to_user_id, status === "completed" ? "Task approved" : "Task returned for revision", status === "completed" ? "The Founder approved your task: " + task.title : "The Founder returned your task with feedback: " + (payload.review_note || ""), "task", task.id);
      }
      setNotice(status === "completed" ? "Task approved and marked completed." : status === "in_progress" && isOwner ? "Task returned to the staff member for revision." : "Task progress updated.");
      await load();
    }
    setSaving(false);
  }
  async function addComment(task: StaffTask) {
    if (!supabase || !profile) return;
    const comment = (commentDrafts[task.id] || "").trim(); if (!comment) return;
    setSaving(true); const { error: insertError } = await supabase.from("staff_task_comments").insert({ task_id: task.id, user_id: profile.user_id, comment });
    if (insertError) setError(insertError.message); else { setCommentDrafts(old => ({ ...old, [task.id]: "" })); await load(); }
    setSaving(false);
  }
  async function requestExtension(task: StaffTask) {
    if (!supabase || !profile) return;
    const draft = extensionDrafts[task.id]; if (!draft?.date || !draft.reason.trim()) { setError("Choose a proposed deadline and explain the reason."); return; }
    setSaving(true); const { error: insertError } = await supabase.from("staff_task_extension_requests").insert({ task_id: task.id, requested_by: profile.user_id, current_due_at: task.due_at, requested_due_at: new Date(draft.date).toISOString(), reason: draft.reason.trim() });
    if (insertError) setError(insertError.message); else { setNotice("Deadline extension request sent to the Founder."); setExtensionDrafts(old => ({ ...old, [task.id]: { date: "", reason: "" } })); await load(); }
    setSaving(false);
  }
  async function reviewExtension(request: Extension, approved: boolean) {
    if (!supabase || !isOwner) return;
    const { error: updateError } = await supabase.from("staff_task_extension_requests").update({ status: approved ? "approved" : "declined", reviewed_by: profile?.user_id, reviewed_at: new Date().toISOString() }).eq("id", request.id);
    if (updateError) setError(updateError.message);
    else { const task = tasks.find(item => item.id === request.task_id); if (approved && task) await supabase.from("staff_tasks").update({ due_at: request.requested_due_at, updated_at: new Date().toISOString() }).eq("id", task.id); if (task?.assigned_to_user_id) await notifyUser(task.assigned_to_user_id, approved ? "Deadline extension approved" : "Deadline extension declined", "Your request for " + task.title + " was " + (approved ? "approved." : "declined."), "task", task.id); setNotice("Deadline request reviewed."); await load(); }
  }
  async function saveMeeting(meeting: Meeting) {
    if (!supabase || !isOwner) return;
    const draft = meetingDrafts[meeting.id];
    if (!draft) return;
    setSaving(true); setError(""); setNotice("");
    const startsAt = new Date(draft.starts_at).toISOString();
    const { error: updateError } = await supabase.from("staff_meetings").update({
      starts_at: startsAt,
      meeting_url: draft.meeting_url.trim() || null,
      status: draft.status,
      agenda: draft.agenda.trim(),
      discussion_notes: draft.discussion_notes.trim() || null,
      decisions: draft.decisions.trim() || null,
      action_points: draft.action_points.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", meeting.id);
    if (updateError) setError(updateError.message);
    else {
      const changes: string[] = [];
      if (startsAt !== meeting.starts_at) changes.push("rescheduled");
      if ((draft.meeting_url.trim() || null) !== meeting.meeting_url) changes.push("meeting link changed");
      if (draft.status === "cancelled" && meeting.status !== "cancelled") changes.push("cancelled");
      if (changes.length) {
        let recipients = staff.map(member => member.user_id);
        if (meeting.visibility === "invited") {
          const { data } = await supabase.from("staff_meeting_participants").select("user_id").eq("meeting_id", meeting.id);
          recipients = (data || []).map((row: { user_id: string }) => row.user_id);
        }
        await Promise.all(recipients.filter(id => id !== profile?.user_id).map(id =>
          notifyUser(id, "Meeting update: " + meeting.title, "This meeting has been " + changes.join(" and ") + ". Please check the updated details in Staff Activities.", "meeting_update", meeting.id)
        ));
      }
      setNotice("Meeting details and records updated." + (changes.length ? " Dashboard notifications were created for affected participants." : ""));
      setMeetingDrafts(old => { const next = { ...old }; delete next[meeting.id]; return next; });
      await load();
    }
    setSaving(false);
  }

  async function markAttendance(meetingId: string, value: string) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("staff_meeting_participants").update({ attendance: value }).eq("meeting_id", meetingId).eq("user_id", profile?.user_id);
    if (updateError) setError(updateError.message); else { setAttendance(old => ({ ...old, [meetingId]: value })); setNotice("Attendance updated."); }
  }
  async function acknowledge(announcementId: string) {
    if (!supabase || !profile) return;
    const { error: insertError } = await supabase.from("staff_announcement_acknowledgements").upsert({ announcement_id: announcementId, user_id: profile.user_id });
    if (insertError) setError(insertError.message); else setAcknowledged(old => [...old, announcementId]);
  }
  async function markNotificationRead(item: Notification) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("staff_dashboard_notifications").update({ read_at: new Date().toISOString() }).eq("id", item.id);
    if (updateError) setError(updateError.message); else setNotifications(old => old.map(row => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
  }

  if (loading) return <main className="grid min-h-[70vh] place-items-center bg-[#f5f7f3] text-sm font-semibold text-[#42694b]">Loading staff workspace…</main>;
  if (!profile) return <main className="min-h-[70vh] bg-[#f5f7f3] p-8"><section className="mx-auto max-w-xl rounded-3xl bg-white p-7"><h1 className="text-xl font-bold text-[#203b2a]">Staff workspace access</h1><p className="mt-3 text-sm text-red-700">{error}</p><Link href="/admin" className="mt-5 inline-flex text-sm font-bold text-[#315b43]">Return to admin</Link></section></main>;

  const tabs: { id: Tab; label: string; icon: typeof CalendarDays }[] = [
    { id: "overview", label: "My dashboard", icon: Bell }, { id: "meetings", label: "Meetings", icon: CalendarDays },
    { id: "tasks", label: "Tasks", icon: CheckCircle2 }, { id: "announcements", label: "Announcements", icon: Megaphone },
  ];
  const meetingVisible = meetings;
  const taskCard = (task: StaffTask) => (
    <article key={task.id} className="rounded-2xl border border-[#e5ebe2] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#23432f]">{task.title}</h3>{task.priority === "urgent" && <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">Urgent</span>}{isOverdue(task) && <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">Overdue</span>}</div><p className="mt-1 text-sm leading-6 text-[#718071]">{task.description}</p><p className="mt-2 text-[11px] text-[#8b9789]">Assigned {dateTime(task.assigned_at)} · {task.due_at ? "Due " + dateTime(task.due_at) : "No deadline"}{isOwner ? " · " + (task.assigned_to_user_id ? staffName(task.assigned_to_user_id) : task.assigned_department || "Department task") : ""}</p></div>
        <span className="rounded-full bg-[#f1f5ef] px-3 py-1.5 text-[10px] font-bold text-[#47654b]">{statusLabel(task.status)}</span>
      </div>
      {task.review_note && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Founder feedback: {task.review_note}</p>}
      {task.completion_notes && <p className="mt-3 rounded-xl bg-[#f4f7f2] p-3 text-xs text-[#526553]">Completion note: {task.completion_notes}</p>}
      <div className="mt-4 space-y-2 border-t border-[#edf0eb] pt-4">
        <p className="text-xs font-bold text-[#415944]">Task discussion</p>
        {comments.filter(item => item.task_id === task.id).map(item => <p key={item.id} className="rounded-lg bg-[#f7f9f5] p-2 text-xs text-[#586a59]"><strong>{item.user_id === profile.user_id ? "You" : "Founder"}:</strong> {item.comment}</p>)}
        <div className="flex gap-2"><input value={commentDrafts[task.id] || ""} onChange={e => setCommentDrafts(old => ({ ...old, [task.id]: e.target.value }))} placeholder="Add a comment or question…" className="min-w-0 flex-1 rounded-xl border border-[#e1e8de] px-3 py-2 text-xs"/><button type="button" onClick={() => void addComment(task)} className="rounded-xl bg-[#245b42] px-3 text-white" aria-label="Send comment"><Send size={14}/></button></div>
      </div>
      {!isOwner && <div className="mt-4 flex flex-wrap gap-2">
        {task.status === "pending" && <button disabled={saving} onClick={() => void changeTaskStatus(task,"accepted")} className="rounded-xl border px-3 py-2 text-xs font-bold">Accept task</button>}
        {["pending","accepted","in_progress"].includes(task.status) && <button disabled={saving} onClick={() => void changeTaskStatus(task,"in_progress")} className="rounded-xl bg-[#245b42] px-3 py-2 text-xs font-bold text-white">Start / continue</button>}
        {["accepted","in_progress"].includes(task.status) && <div className="flex w-full flex-wrap gap-2"><input value={completionDrafts[task.id] || ""} onChange={e => setCompletionDrafts(old => ({ ...old, [task.id]: e.target.value }))} placeholder="Completion note (optional)" className="min-w-[180px] flex-1 rounded-xl border px-3 py-2 text-xs"/><button disabled={saving} onClick={() => void changeTaskStatus(task,"submitted_for_review")} className="rounded-xl bg-[#245b42] px-3 py-2 text-xs font-bold text-white">Submit for review</button></div>}
        {!["completed","cancelled"].includes(task.status) && <details className="w-full rounded-xl border p-3"><summary className="cursor-pointer text-xs font-bold">Request deadline extension</summary><div className="mt-3 grid gap-2 sm:grid-cols-2"><input type="datetime-local" value={extensionDrafts[task.id]?.date || ""} onChange={e => setExtensionDrafts(old => ({ ...old, [task.id]: { date: e.target.value, reason: old[task.id]?.reason || "" } }))} className="rounded-lg border px-3 py-2 text-xs"/><input value={extensionDrafts[task.id]?.reason || ""} onChange={e => setExtensionDrafts(old => ({ ...old, [task.id]: { date: old[task.id]?.date || "", reason: e.target.value } }))} placeholder="Reason for extension" className="rounded-lg border px-3 py-2 text-xs"/></div><button onClick={() => void requestExtension(task)} className="mt-2 rounded-lg bg-[#245b42] px-3 py-2 text-xs font-bold text-white">Send request</button></details>}
      </div>}
      {isOwner && task.status === "submitted_for_review" && <div className="mt-4 flex flex-wrap gap-2"><input value={completionDrafts[task.id] || ""} onChange={e => setCompletionDrafts(old => ({ ...old, [task.id]: e.target.value }))} placeholder="Feedback if returning for revision" className="min-w-[220px] flex-1 rounded-xl border px-3 py-2 text-xs"/><button disabled={saving} onClick={() => void changeTaskStatus(task,"completed")} className="rounded-xl bg-[#245b42] px-3 py-2 text-xs font-bold text-white">Approve completion</button><button disabled={saving} onClick={() => void changeTaskStatus(task,"in_progress")} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Return for revision</button></div>}
    </article>
  );

  return <main className="admin-glass-shell min-h-screen bg-[#f5f7f3] px-4 py-7 text-[#26392c] sm:px-8"><div className="mx-auto max-w-7xl">
    <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-[#65806a]"><ArrowLeft size={14}/> Admin overview</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#9a7a33]">People & administration</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#1d3e2b] sm:text-4xl">{isOwner ? "Staff activities & coordination" : "My staff workspace"}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#718071]">{isOwner ? "Schedule meetings, publish announcements, assign work and review staff progress." : "Your meetings, important announcements, reminders and assigned tasks in one place."}</p></div><div className="flex gap-2"><button onClick={() => { setLoading(true); setError(""); void load(); }} className="inline-flex items-center gap-2 rounded-xl border border-[#e3e9e0] bg-white px-4 py-3 text-xs font-bold"><RefreshCw size={14}/> Refresh</button>{isOwner && <span className="inline-flex items-center gap-2 rounded-xl bg-[#eaf2e8] px-4 py-3 text-xs font-bold text-[#315b43]"><ShieldCheck size={15}/> Founder controls</span>}</div></div>
    {error && <p role="alert" className="mt-5 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"><CircleAlert size={16}/>{error}<button onClick={() => setError("")} className="ml-auto"><X size={15}/></button></p>}
    {notice && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[{label:"My pending tasks",value:pendingCount,icon:CheckCircle2},{label:"Overdue tasks",value:overdueCount,icon:Clock3},{label:"Upcoming meetings",value:upcomingMeetings.length,icon:CalendarDays},{label:"Unread reminders",value:unreadNotifications,icon:Bell}].map(item=><article key={item.label} className="rounded-2xl border border-[#e4ebe1] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs text-[#7a8879]">{item.label}</p><item.icon size={17} className="text-[#56745b]"/></div><p className="mt-2 text-2xl font-black text-[#21442f]">{item.value}</p></article>)}
    </div>
    <div className="mt-6 flex flex-wrap gap-2 border-b border-[#dfe7dc] pb-3">{tabs.map(item=><button key={item.id} onClick={() => setTab(item.id)} className={tab===item.id?"inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-4 py-2.5 text-xs font-bold text-white":"inline-flex items-center gap-2 rounded-xl border border-[#e0e8de] bg-white px-4 py-2.5 text-xs font-bold text-[#55705a]"}><item.icon size={15}/>{item.label}</button>)}</div>
    {tab === "overview" && <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold text-[#25452f]">Upcoming meetings</h2><button onClick={() => setTab("meetings")} className="text-xs font-bold text-[#55745a]">View all</button></div>{isOwner && <button onClick={() => { setTab("meetings"); setShowMeetingForm(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-4 py-2.5 text-xs font-bold text-white"><Plus size={14}/> Schedule meeting</button>}{upcomingMeetings.map(meeting=><article key={meeting.id} className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold text-[#9a7a33]">{typeLabel(meeting.meeting_type)}</p><h3 className="mt-1 font-bold">{meeting.title}</h3><p className="mt-1 text-xs text-[#758274]">{dateTime(meeting.starts_at)}{meeting.is_recurring?" · Repeats "+meeting.recurrence_rule:""}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#657465]">{meeting.agenda}</p>{meeting.meeting_url&&<a href={meeting.meeting_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#245b42]"><Video size={14}/> Join meeting <Link2 size={12}/></a>}</article>)}{upcomingMeetings.length===0&&<p className="rounded-2xl border border-dashed p-7 text-center text-sm text-[#8a9689]">No upcoming meetings.</p>}</section>
      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold text-[#25452f]">My pending tasks</h2><button onClick={() => setTab("tasks")} className="text-xs font-bold text-[#55745a]">View all</button></div>{visibleTasks.filter(task=>!["completed","cancelled"].includes(task.status)).slice(0,5).map(taskCard)}{visibleTasks.filter(task=>!["completed","cancelled"].includes(task.status)).length===0&&<p className="rounded-2xl border border-dashed p-7 text-center text-sm text-[#8a9689]">No pending tasks.</p>}</section>
      <section className="space-y-3"><h2 className="font-bold text-[#25452f]">Important reminders</h2>{notifications.slice(0,6).map(item=><article key={item.id} className="flex items-start gap-3 rounded-xl border bg-white p-3"><Bell size={15} className="mt-1 text-[#9a7a33]"/><div className="min-w-0 flex-1"><p className="text-xs font-bold">{item.title}</p><p className="mt-1 text-xs text-[#788578]">{item.body}</p><p className="mt-1 text-[10px] text-[#9aa397]">{dateTime(item.created_at)}</p></div>{!item.read_at&&<button onClick={()=>void markNotificationRead(item)} className="text-[10px] font-bold text-[#245b42]">Read</button>}</article>)}{notifications.length===0&&<p className="rounded-xl border border-dashed p-5 text-xs text-[#8a9689]">No reminders yet.</p>}</section>
      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold text-[#25452f]">Company announcements</h2><button onClick={() => setTab("announcements")} className="text-xs font-bold text-[#55745a]">View history</button></div>{announcements.slice(0,4).map(item=><article key={item.id} className="rounded-xl border bg-white p-4"><div className="flex items-center gap-2"><h3 className="text-sm font-bold">{item.title}</h3>{item.importance==="important"&&<span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-800">Important</span>}</div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#6e7b6d]">{item.body}</p></article>)}{announcements.length===0&&<p className="rounded-xl border border-dashed p-5 text-xs text-[#8a9689]">No announcements yet.</p>}</section>
    </div>}
    {tab === "meetings" && <section className="mt-6 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Meetings & agenda</h2><p className="text-xs text-[#7d897a]">Company-wide and invitation-only meetings.</p></div>{isOwner&&<button onClick={()=>setShowMeetingForm(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-4 py-3 text-xs font-bold text-white"><Plus size={14}/> Schedule meeting</button>}</div>
      {showMeetingForm&&isOwner&&<form onSubmit={createMeeting} className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Schedule a meeting</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Meeting title<input required value={meetingTitle} onChange={e=>setMeetingTitle(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-semibold">Meeting type<select value={meetingType} onChange={e=>setMeetingType(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="management">Management</option><option value="general_staff">General staff</option><option value="training">Training</option><option value="special">Special</option></select></label><label className="text-xs font-semibold">Visibility<select value={meetingVisibility} onChange={e=>setMeetingVisibility(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="company">All active staff</option><option value="invited">Selected participants only</option></select></label><label className="text-xs font-semibold">Date and time<input required type="datetime-local" value={meetingDate} onChange={e=>setMeetingDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-semibold">End time (optional)<input type="datetime-local" value={meetingEnd} onChange={e=>setMeetingEnd(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-semibold">Meeting link<input type="url" value={meetingUrl} onChange={e=>setMeetingUrl(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-semibold sm:col-span-2">Agenda / discussion points<textarea required value={meetingAgenda} onChange={e=>setMeetingAgenda(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-semibold">Repeat<select value={meetingRepeat} onChange={e=>setMeetingRepeat(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="none">One-time</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>{meetingRepeat!=="none"&&<label className="text-xs font-semibold">Repeat until<input type="date" value={meetingRepeatUntil} onChange={e=>setMeetingRepeatUntil(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>}</div>{meetingVisibility==="invited"&&<div className="mt-4"><p className="mb-2 text-xs font-bold">Invite staff</p><div className="grid gap-2 sm:grid-cols-2">{staff.filter(member=>member.user_id!==profile?.user_id).map(member=><label key={member.user_id} className="flex items-center gap-2 rounded-xl border p-3 text-xs"><input type="checkbox" checked={meetingParticipants.includes(member.user_id)} onChange={e=>setMeetingParticipants(old=>e.target.checked?[...old,member.user_id]:old.filter(id=>id!==member.user_id))}/>{member.display_name||member.email}</label>)}</div></div>}<div className="mt-4 flex gap-2"><button disabled={saving} className="rounded-xl bg-[#245b42] px-5 py-3 text-xs font-bold text-white">{saving?"Saving…":"Save meeting"}</button><button type="button" onClick={()=>setShowMeetingForm(false)} className="rounded-xl border px-4 py-3 text-xs font-bold">Cancel</button></div></form>}
      {meetingVisible.map(meeting=><article key={meeting.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#9a7a33]">{typeLabel(meeting.meeting_type)} · {meeting.visibility==="company"?"All staff":"Invitation only"}</p><h3 className="mt-1 text-lg font-bold text-[#24432f]">{meeting.title}</h3><p className="mt-1 text-xs text-[#788578]">{dateTime(meeting.starts_at)}{meeting.is_recurring?" · Repeats "+meeting.recurrence_rule:""}</p></div><span className="h-fit rounded-full bg-[#eef4ec] px-3 py-1.5 text-[10px] font-bold text-[#49654c]">{meeting.status}</span></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div><p className="text-xs font-bold">Agenda & discussion points</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#6c796b]">{meeting.agenda||"No agenda supplied."}</p></div><div>{meeting.meeting_url&&<a href={meeting.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-4 py-3 text-xs font-bold text-white"><Video size={14}/> Join meeting</a>}{meeting.discussion_notes&&<p className="mt-3 whitespace-pre-wrap text-xs text-[#6c796b]"><strong>Discussion notes:</strong> {meeting.discussion_notes}</p>}{meeting.decisions&&<p className="mt-2 whitespace-pre-wrap text-xs text-[#6c796b]"><strong>Decisions:</strong> {meeting.decisions}</p>}{meeting.action_points&&<p className="mt-2 whitespace-pre-wrap text-xs text-[#6c796b]"><strong>Action points:</strong> {meeting.action_points}</p>}</div></div>{isOwner&&<details className="mt-4 rounded-xl border border-[#e5ebe2] p-3"><summary className="cursor-pointer text-xs font-bold text-[#42634a]">Edit meeting / record minutes</summary>{(()=>{const d=meetingDrafts[meeting.id]||{starts_at:toLocalInput(meeting.starts_at),meeting_url:meeting.meeting_url||"",status:meeting.status,agenda:meeting.agenda||"",discussion_notes:meeting.discussion_notes||"",decisions:meeting.decisions||"",action_points:meeting.action_points||""};return <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Date and time<input type="datetime-local" value={d.starts_at} onChange={e=>setMeetingDrafts(old=>({...old,[meeting.id]:{...d,starts_at:e.target.value}}))} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-semibold">Meeting status<select value={d.status} onChange={e=>setMeetingDrafts(old=>({...old,[meeting.id]:{...d,status:e.target.value}}))} className="mt-1 w-full rounded-lg border p-2"><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><label className="text-xs font-semibold sm:col-span-2">Meeting link<input type="url" value={d.meeting_url} onChange={e=>setMeetingDrafts(old=>({...old,[meeting.id]:{...d,meeting_url:e.target.value}}))} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-semibold sm:col-span-2">Agenda<textarea value={d.agenda} onChange={e=>setMeetingDrafts(old=>({...old,[meeting.id]:{...d,agenda:e.target.value}}))} rows={2} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-semibold">Discussion notes<textarea value={d.discussion_notes} onChange={e=>setMeetingDrafts(old=>({...old,[meeting.id]:{...d,discussion_notes:e.target.value}}))} rows={3} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-semibold">Decisions made<textarea value={d.decisions} onChange={e=>setMeetingDrafts(old=>({...old,[meeting.id]:{...d,decisions:e.target.value}}))} rows={3} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-semibold sm:col-span-2">Action points<textarea value={d.action_points} onChange={e=>setMeetingDrafts(old=>({...old,[meeting.id]:{...d,action_points:e.target.value}}))} rows={2} className="mt-1 w-full rounded-lg border p-2"/></label><button onClick={()=>void saveMeeting(meeting)} disabled={saving} className="rounded-lg bg-[#245b42] px-4 py-2 text-xs font-bold text-white">Save meeting updates</button></div>})()}</details>}{attendance[meeting.id]!==undefined&&<div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs"><span className="font-bold">Attendance:</span><select value={attendance[meeting.id]} onChange={e=>void markAttendance(meeting.id,e.target.value)} className="rounded-lg border px-3 py-2"><option value="pending">Not marked</option><option value="attended">I attended</option><option value="absent">I was absent</option></select></div>}</article>)}
    </section>}
    {tab === "tasks" && <section className="mt-6 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Task board</h2><p className="text-xs text-[#7d897a]">{isOwner?"All staff assignments and review queue.":"Only tasks assigned to you are shown."}</p></div>{isOwner&&<button onClick={()=>setShowTaskForm(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-4 py-3 text-xs font-bold text-white"><Plus size={14}/> Assign task</button>}</div>
      {showTaskForm&&isOwner&&<form onSubmit={createTask} className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Create staff task</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Task title<input required value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-semibold">Priority<select value={taskPriority} onChange={e=>setTaskPriority(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="normal">Normal</option><option value="urgent">Urgent</option></select></label><label className="text-xs font-semibold">Assign to individual<select value={taskAssignee} onChange={e=>setTaskAssignee(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="">Choose staff (optional if department selected)</option>{staff.filter(member=>member.user_id!==profile?.user_id).map(member=><option key={member.user_id} value={member.user_id}>{member.display_name||member.email}</option>)}</select></label><label className="text-xs font-semibold">Or assign to department<select value={taskDepartment} onChange={e=>setTaskDepartment(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="">No department</option>{departments.map(item=><option key={item}>{item}</option>)}</select></label><label className="text-xs font-semibold">Deadline<input type="datetime-local" value={taskDue} onChange={e=>setTaskDue(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-semibold sm:col-span-2">Task description<textarea value={taskDescription} onChange={e=>setTaskDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border p-3"/></label></div><p className="mt-3 text-xs text-[#8a9689]">A department-only task stays in the Founder view until the individual distribution workflow is selected.</p><div className="mt-4 flex gap-2"><button disabled={saving} className="rounded-xl bg-[#245b42] px-5 py-3 text-xs font-bold text-white">{saving?"Saving…":"Create task"}</button><button type="button" onClick={()=>setShowTaskForm(false)} className="rounded-xl border px-4 py-3 text-xs font-bold">Cancel</button></div></form>}
      {visibleTasks.map(taskCard)}
      {visibleTasks.length===0&&<p className="rounded-2xl border border-dashed bg-white p-9 text-center text-sm text-[#8a9689]">No tasks assigned to you yet.</p>}
      {isOwner&&extensions.filter(request=>request.status==="pending").length>0&&<div className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Deadline extension requests</h3>{extensions.filter(request=>request.status==="pending").map(request=><div key={request.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs"><div><strong>{tasks.find(task=>task.id===request.task_id)?.title||"Task"}</strong><p className="mt-1 text-[#788578]">{staffName(request.requested_by)} requests {dateTime(request.requested_due_at)} · {request.reason}</p></div><div className="flex gap-2"><button onClick={()=>void reviewExtension(request,true)} className="rounded-lg bg-[#245b42] px-3 py-2 font-bold text-white">Approve</button><button onClick={()=>void reviewExtension(request,false)} className="rounded-lg border px-3 py-2 font-bold">Decline</button></div></div>)}</div>}
    </section>}
    {tab === "announcements" && <section className="mt-6 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Company announcements</h2><p className="text-xs text-[#7d897a]">Company announcements and their acknowledgement requirements.</p></div>{isOwner&&<button onClick={()=>setShowAnnouncementForm(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-4 py-3 text-xs font-bold text-white"><Plus size={14}/> Publish announcement</button>}</div>
      {showAnnouncementForm&&isOwner&&<form onSubmit={createAnnouncement} className="rounded-2xl border bg-white p-5"><h3 className="font-bold">New company announcement</h3><div className="mt-4 grid gap-3"><label className="text-xs font-semibold">Title<input required value={announcementTitle} onChange={e=>setAnnouncementTitle(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-semibold">Announcement<textarea required value={announcementBody} onChange={e=>setAnnouncementBody(e.target.value)} rows={5} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-semibold">Importance<select value={announcementImportance} onChange={e=>setAnnouncementImportance(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="normal">Normal</option><option value="important">Important — acknowledgement required</option></select></label></div><div className="mt-4 flex gap-2"><button disabled={saving} className="rounded-xl bg-[#245b42] px-5 py-3 text-xs font-bold text-white">{saving?"Publishing…":"Publish"}</button><button type="button" onClick={()=>setShowAnnouncementForm(false)} className="rounded-xl border px-4 py-3 text-xs font-bold">Cancel</button></div></form>}
      {announcements.map(item=><article key={item.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-[10px] text-[#8b9789]">{dateTime(item.published_at)}</p></div>{item.importance==="important"&&<span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-800">Important · Acknowledgement required</span>}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#69786a]">{item.body}</p>{item.importance==="important"&&!isOwner&&!acknowledged.includes(item.id)&&<button onClick={()=>void acknowledge(item.id)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-4 py-2.5 text-xs font-bold text-white"><Check size={14}/> Acknowledge</button>}{item.importance==="important"&&!isOwner&&acknowledged.includes(item.id)&&<p className="mt-4 text-xs font-bold text-green-700">You acknowledged this announcement.</p>}</article>)}
    </section>}
    <p className="mt-8 rounded-xl border border-[#e5ebe2] bg-white/70 p-4 text-[11px] leading-5 text-[#849083]">Dashboard reminders are active for this workspace. Email and WhatsApp delivery require a configured messaging provider and will be connected separately; this page does not claim those messages have been sent.</p>
  </div></main>;
}

function MegaphoneIcon(props: { size?: number }) {
  return <span className="inline-flex"><Bell size={props.size || 15}/></span>;
}
