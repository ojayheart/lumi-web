import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const AUTH_STORAGE_KEY = 'lumi-admin-auth';

export function LogoutButton() {
  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.reload();
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      className="gap-2"
      data-testid="button-logout"
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  );
}
