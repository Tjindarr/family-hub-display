import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getSubscriptionStatus,
  registerPushSubscription,
  unregisterPushSubscription,
  isPushSupported,
} from "@/lib/push-notifications";

interface Props {
  role: "parent" | "kid";
  kidId?: string;
  compact?: boolean;
}

export function PushNotificationToggle({ role, kidId, compact }: Props) {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSubscriptionStatus().then((status) => {
      setSupported(status.supported);
      setSubscribed(status.subscribed);
      setPermission(status.permission);
    });
  }, []);

  if (!supported) return null;

  const handleToggle = async () => {
    setLoading(true);
    if (subscribed) {
      await unregisterPushSubscription();
      setSubscribed(false);
      toast.success("Notifications turned off");
    } else {
      const result = await registerPushSubscription(role, kidId);
      if (result.success) {
        setSubscribed(true);
        toast.success("🔔 Notifications enabled!");
      } else {
        toast.error(result.error || "Failed to enable notifications");
      }
    }
    const status = await getSubscriptionStatus();
    setPermission(status.permission);
    setLoading(false);
  };

  if (compact) {
    return (
      <Button
        variant={subscribed ? "default" : "outline"}
        size="icon"
        className="h-11 w-11"
        onClick={handleToggle}
        disabled={loading || permission === "denied"}
        title={
          permission === "denied"
            ? "Notifications blocked in browser settings"
            : subscribed
            ? "Notifications on – tap to turn off"
            : "Turn on notifications"
        }
      >
        {subscribed ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={subscribed ? "secondary" : "outline"}
        className="gap-2 text-base h-11"
        onClick={handleToggle}
        disabled={loading || permission === "denied"}
      >
        {subscribed ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        {loading
          ? "Setting up..."
          : subscribed
          ? "Notifications On"
          : "Enable Notifications"}
      </Button>
      {permission === "denied" && (
        <span className="text-sm text-destructive">
          Blocked in browser settings
        </span>
      )}
    </div>
  );
}
