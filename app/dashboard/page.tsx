import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardHome() {
  return (
    <div className="grid gap-4 md:gap-6 md:grid-cols-2">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-pretty">Welcome to Airmango</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Use the sidebar to manage Trips and Users.</p>
        </CardContent>
      </Card>
      <Card className="glass">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <a className="underline" href="/dashboard/trips">
            Manage Trips
          </a>
          <a className="underline" href="/dashboard/users">
            Manage Users
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
