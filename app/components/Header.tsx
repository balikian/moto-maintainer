import { createClient } from '../../lib/supabase/server';

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

console.log("AUTH USER DATA:", user);

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initials = user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U';

  return (
    <header className="flex items-center justify-between bg-white shadow-sm px-6 py-4">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="User avatar"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
            {initials.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900">
            {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
      </div>
    </header>
  );
}
