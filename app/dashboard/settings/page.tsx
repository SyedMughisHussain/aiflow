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

export const metadata: Metadata = {
  title: "Settings — AIFlow",
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue={user.name ?? ""} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue={user.email} disabled />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge variant="outline">{user.role}</Badge>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          <Button disabled>Save changes</Button>
          <p className="text-xs text-muted-foreground">
            Editing your profile isn&apos;t available yet.
          </p>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how AIFlow looks on your device.</CardDescription>
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
