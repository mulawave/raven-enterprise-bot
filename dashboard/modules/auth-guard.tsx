import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function withAuthGuard(Component: any, roles: string[] = []) {
  return function AuthGuarded(props: any) {
    const router = useRouter();
    useEffect(() => {
      getSession().then((session: any) => {
        if (!session || (roles.length && !roles.includes(session.role))) {
          router.replace("/login");
        }
      });
    }, []);
    return <Component {...props} />;
  };
}

export async function getSession() {
  if (typeof window === "undefined") return null;
  const session = localStorage.getItem("session");
  return session ? JSON.parse(session) : null;
}
