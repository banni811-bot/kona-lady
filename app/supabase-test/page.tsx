import { supabase } from "../../lib/supabase";

export default async function SupabaseTestPage() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .limit(1);

  return (
    <main className="min-h-screen bg-[#f7f3ff] p-8">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow">
        <h1 className="text-3xl font-black text-purple-700">
          Supabase Test
        </h1>

        {error ? (
          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">
            <div className="font-bold">
              Supabase подключён
            </div>

            <div className="mt-2 text-sm">
              Но таблицы profiles пока нет.
            </div>

            <div className="mt-2 text-xs">
              {error.message}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-green-50 p-5 text-green-700">
            <div className="font-bold">
              Supabase подключён!
            </div>

            <div className="mt-2 text-sm">
              Данные из таблицы profiles получены.
            </div>

            <pre className="mt-4 overflow-auto rounded-xl bg-white p-4 text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}