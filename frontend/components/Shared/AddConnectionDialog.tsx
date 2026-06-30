"use client";

import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { createConnection } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormError } from "@/components/ui/form-error";
import { Plus, Loader2, Link2, ShieldCheck } from "lucide-react";

interface Props {
  trigger?: React.ReactNode;
}

const DEFAULT_PORTS: Record<string, string> = {
  postgres: "5432", mysql: "3306", mariadb: "3306", mssql: "1433",
  cockroach: "26257", sqlite: "",
};

const DEFAULT_USERNAMES: Record<string, string> = {
  postgres: "postgres", mysql: "root", mariadb: "root",
  mssql: "sa", cockroach: "root", sqlite: "",
};

function getUrlPlaceholder(dbType: string): string {
  switch (dbType) {
    case "postgres":  return "postgresql://user:password@host:5432/dbname";
    case "cockroach": return "postgresql://user:password@host:26257/defaultdb";
    case "mysql":     return "mysql://user:password@host:3306/dbname";
    case "mariadb":   return "mysql://user:password@host:3306/dbname";
    case "mssql":     return "sqlserver://user:password@host:1433?database=dbname";
    default:          return `${dbType}://user:password@host:port/dbname`;
  }
}

export function AddConnectionDialog({ trigger }: Props = {}) {
  const { addConnection } = useStore();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dbUrl, setDbUrl] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    db_type: "postgres",
    host: "localhost",
    port: "5432",
    username: "",
    password: "",
    db_name: "",
    use_ssl: false,
  });

  const handleUrlPaste = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setDbUrl(url);

    try {
      if (url.includes("://")) {
        const parsed = new URL(url);
        let scheme = parsed.protocol.replace(":", "");
        if (scheme === "postgresql") scheme = "postgres";
        if (scheme === "cockroachdb") scheme = "cockroach";
        if (scheme === "sqlserver") scheme = "mssql";

        const supported = ["postgres", "mysql", "mariadb", "mssql", "cockroach"];
        if (supported.includes(scheme)) {
          setFormData((prev) => ({
            ...prev,
            db_type: scheme,
            host: parsed.hostname || prev.host,
            port: parsed.port || DEFAULT_PORTS[scheme] || prev.port,
            username: parsed.username || prev.username,
            password: parsed.password || prev.password,
            db_name: parsed.pathname.replace("/", "") || prev.db_name,
            use_ssl: parsed.searchParams.get("sslmode") === "require" || prev.use_ssl,
          }));
        }
      }
    } catch {
      // ignore invalid URLs while typing
    }
  };

  const getErrorMessage = (err: unknown) => {
    if (typeof err === "object" && err !== null) {
      const response = (err as { response?: { data?: { detail?: unknown } } })
        .response;
      if (typeof response?.data?.detail === "string")
        return response.data.detail;
    }
    if (err instanceof Error) return err.message;
    return "Unknown error";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await createConnection(formData);
      if (res.status === "success") {
        addConnection({
          id: res.connection_id,
          name: formData.name,
          db_type: formData.db_type,
          host: formData.host,
          port: formData.port || DEFAULT_PORTS[formData.db_type] || "",
          username: formData.username || "",
          db_name: formData.db_name || "",
          use_ssl: formData.use_ssl || false,
        });
        setOpen(false);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) {
        setDbUrl("");
        setError("");
        setFormData({ name: "", db_type: "postgres", host: "localhost", port: "5432", username: "", password: "", db_name: "", use_ssl: false });
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-content-3 hover:text-content-1"
          >
            <Plus className="h-4 w-4" />
            Add Connection
          </Button>
        )}
      </DialogTrigger>

      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Connect Database</DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
          {/* Connection URL shortcut — not applicable for SQLite */}
          {formData.db_type !== "sqlite" && (
            <>
              <div className="space-y-1.5">
                <Label className="gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-content-3" />
                  Connection URL
                  <span className="text-content-3 font-normal">(optional)</span>
                </Label>
                <Input
                  value={dbUrl}
                  onChange={handleUrlPaste}
                  placeholder={getUrlPlaceholder(formData.db_type)}
                  className="font-mono text-[12px]"
                />
                <p className="text-[11px] text-content-3 leading-relaxed">
                  Pasting a URL auto-fills the fields below.
                </p>
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--ds-border-subtle)]" />
            </>
          )}

          {/* Name + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="conn-name">Name</Label>
              <Input
                id="conn-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="My Database"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={formData.db_type}
                onValueChange={(val) => {
                  setDbUrl("");
                  setFormData({
                    ...formData,
                    db_type: val,
                    port: DEFAULT_PORTS[val] ?? "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="mariadb">MariaDB</SelectItem>
                  <SelectItem value="mssql">SQL Server</SelectItem>
                  <SelectItem value="cockroach">CockroachDB</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.db_type === "sqlite" ? (
            /* SQLite: just a file path */
            <div className="space-y-1.5">
              <Label htmlFor="conn-db">Database file path</Label>
              <Input
                id="conn-db"
                name="db_name"
                value={formData.db_name}
                onChange={handleChange}
                required
                placeholder="/data/myapp.db"
              />
            </div>
          ) : (
            <>
              {/* Host + Port */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="conn-host">Host</Label>
                  <Input id="conn-host" name="host" value={formData.host}
                    onChange={handleChange} required placeholder="localhost" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conn-port">Port</Label>
                  <Input id="conn-port" name="port" value={formData.port}
                    onChange={handleChange} required placeholder={DEFAULT_PORTS[formData.db_type] || "5432"} />
                </div>
              </div>

              {/* User + DB Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="conn-user">User</Label>
                  <Input id="conn-user" name="username" value={formData.username}
                    onChange={handleChange} required placeholder={DEFAULT_USERNAMES[formData.db_type] || "user"} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conn-db">Database</Label>
                  <Input id="conn-db" name="db_name" value={formData.db_name}
                    onChange={handleChange} required placeholder="production" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="conn-password">Password</Label>
                <Input id="conn-password" name="password" value={formData.password}
                  type="password" onChange={handleChange} required />
              </div>

              {/* SSL toggle */}
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-base-0 px-3 py-2.5 hover:bg-base-1 transition-colors duration-[100ms]">
                <input type="checkbox" checked={formData.use_ssl}
                  onChange={(e) => setFormData({ ...formData, use_ssl: e.target.checked })}
                  className="h-4 w-4 accent-[var(--ds-accent)] cursor-pointer" />
                <div className="flex items-center gap-1.5 text-[13px] text-content-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                  <span>Require SSL</span>
                </div>
                <span className="ml-auto text-[11px] text-content-3">Needed for Neon, Supabase, RDS</span>
              </label>
            </>
          )}

          {/* Error */}
          {error && <FormError message={error} />}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={loading}
            className="min-w-[88px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting…
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
