import { Activity, ArrowRight, Crown, KeyRound, LogOut, ShieldCheck, Trophy, UserRound } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import "@/quiz.css";
import { useState } from "react";

const roles: Record<string,string> = { owner:"مالك المنصة", platform_manager:"مدير منصة", content_moderator:"مشرف محتوى وملفات", support_moderator:"مشرف دعم فني", user:"طالب" };
export default function Account() {
  const { user, loading, logout } = useAuth();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const login = trpc.auth.login.useMutation({ onSuccess: async () => { setMessage(""); await utils.auth.me.invalidate(); }, onError: error => setMessage(error.message) });
  const register = trpc.auth.register.useMutation({ onSuccess: async () => { setMessage(""); await utils.auth.me.invalidate(); }, onError: error => setMessage(error.message) });
  const dashboard = trpc.student.dashboard.useQuery(undefined, { enabled: Boolean(user) });
  if (loading) return <div className="auth-screen" dir="rtl"><span>جاري تحميل الحساب...</span></div>;
  if (!user) return <div className="auth-screen" dir="rtl"><div className="auth-card"><div className="brand-mark large"><UserRound size={28}/></div><span className="section-kicker">حسابي</span><h1>{mode === "login" ? <>بياناتك<br/><em>في مكان واحد.</em></> : <>ابدأ طريقك<br/><em>مع Alpha.</em></>}</h1><p>{mode === "login" ? "سجّل الدخول لمتابعة تقدمك والوصول إلى المحتوى." : "أنشئ حسابك للوصول إلى الملفات والكويزات ولوحة الإنجاز."}</p><form className="auth-form" onSubmit={event => { event.preventDefault(); setMessage(""); if (mode === "login") login.mutate({email,password}); else register.mutate({name,email,password}); }}>
    {mode === "register" && <label>الاسم<input required minLength={2} value={name} onChange={event => setName(event.target.value)} placeholder="اسم الطالب" /></label>}
    <label>البريد الإلكتروني<input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" /></label>
    <label>كلمة المرور<input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="8 أحرف على الأقل" /></label>
    {message && <p className="auth-error" role="alert">{message}</p>}
    <button className="gold-button full" disabled={login.isPending || register.isPending}>{mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}</button>
  </form><button className="text-action auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }}>{mode === "login" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}</button><Link className="back-link" href="/">العودة للرئيسية <ArrowRight size={15}/></Link></div></div>;
  const stats = dashboard.data;
  const isOwner = user.role === "owner";
  return <main className="account-page container-alpha" dir="rtl"><header className="account-heading"><div><span className="section-kicker">حسابي في Alpha</span><h1>{user.name ?? "مستخدم Alpha"}</h1><p>{user.email ?? user.openId}</p></div><div className="account-actions"><Link className="ghost-button" href="/"><ArrowRight size={16}/> الرئيسية</Link>{isOwner && <Link className="gold-button" href="/admin"><Crown size={16}/> لوحة المالك</Link>}<button className="outline-action" onClick={() => void logout()}><LogOut size={16}/> خروج</button></div></header><section className="account-profile"><div className="account-avatar"><UserRound size={28}/></div><div><strong>{user.name ?? "مستخدم Alpha"}</strong><span>{roles[user.role] ?? "حساب Alpha"}</span><small>{user.email ?? user.openId}</small></div><span className="status-pill"><ShieldCheck size={14}/> {user.status === "active" ? "حساب نشط" : "حساب موقوف"}</span></section><section className="student-stat-grid account-stats"><div><Trophy size={20}/><strong>{stats?.completed ?? 0}</strong><span>محاولات مكتملة</span></div><div><Activity size={20}/><strong>{stats?.errors?.length ?? 0}</strong><span>أخطاء تحتاج مراجعة</span></div><div><KeyRound size={20}/><strong>{stats?.remaining ?? 3}</strong><span>كويزات مختلفة متبقية اليوم</span></div></section><section className="account-panels"><div className="student-panel"><div className="panel-heading"><h2>بيانات الحساب</h2><span>{roles[user.role] ?? "طالب"}</span></div><div className="account-detail"><span>طريقة التسجيل</span><strong>{user.loginMethod ?? "Manus"}</strong></div><div className="account-detail"><span>تاريخ إنشاء الحساب</span><strong>{new Date(user.createdAt).toLocaleDateString("ar-SA")}</strong></div><div className="account-detail"><span>آخر دخول</span><strong>{new Date(user.lastSignedIn).toLocaleDateString("ar-SA")}</strong></div></div>{isOwner ? <div className="student-panel owner-access"><div className="panel-heading"><h2>صلاحيات المالك</h2><Crown size={18}/></div><p>هذا الحساب هو مالك المنصة ويملك صلاحيات الهوية، الأدوار، المستخدمين، المحتوى، الكويزات، الملفات، الفيديوهات، وسجل الزيارات.</p><Link className="gold-button" href="/admin">فتح لوحة التحكم</Link></div> : <div className="student-panel"><div className="panel-heading"><h2>التقدم</h2><Link className="inline-link" href="/progress">تفاصيل الإنجاز</Link></div><p className="account-muted">تابع بنك الأخطاء ولوحة المتصدرين والمجلدين من لوحة إنجازك.</p><Link className="gold-button" href="/progress">فتح لوحة الإنجاز</Link></div>}</section></main>;
}
