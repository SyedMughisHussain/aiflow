"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { FormNotice } from "@/components/form-notice"
import { updateProfileAction } from "@/app/dashboard/settings/actions"

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
})

type ProfileValues = z.infer<typeof profileSchema>

export function ProfileForm({ name }: { name: string }) {
  const router = useRouter()
  const [notice, setNotice] = useState<{ variant: "error" | "success"; message: string } | null>(
    null
  )

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name },
  })

  async function onSubmit(values: ProfileValues) {
    setNotice(null)

    const result = await updateProfileAction(values)

    if ("error" in result) {
      setNotice({ variant: "error", message: result.error })
      return
    }

    setNotice({ variant: "success", message: "Profile updated." })
    form.reset({ name: result.name })
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormNotice variant={notice?.variant} message={notice?.message} />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="self-start"
          disabled={form.formState.isSubmitting || !form.formState.isDirty}
        >
          {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
          Save changes
        </Button>
      </form>
    </Form>
  )
}
