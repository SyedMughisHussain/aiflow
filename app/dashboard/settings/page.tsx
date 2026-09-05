import type { Metadata } from "next"

import { requireUser } from "@/lib/auth-guard"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ProfileForm } from "@/components/dashboard/profile-form"

export const metadata: Metadata = {
  title: "Settings — Promptly",
}

export default async function SettingsPage() {
  const user = await requireUser()

  return (
    <>
      <PageHeader title="Settings" description="Manage your account and preferences." />
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ProfileForm name={user.name ?? ""} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" defaultValue={user.email} disabled />
            <p className="text-xs text-muted-foreground">
              Your email is used to sign in and can&apos;t be changed here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge variant="outline">{user.role}</Badge>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how Promptly looks on your device.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Permanently delete your account and all of your data.</CardDescription>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2">
          <Button variant="destructive" disabled>
            Delete account
          </Button>
          <p className="text-xs text-muted-foreground">
            Account deletion isn&apos;t available yet — contact support if you need your data removed.
          </p>
        </CardFooter>
      </Card>
    </>
  )
}
