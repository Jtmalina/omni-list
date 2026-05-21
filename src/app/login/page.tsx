import { signIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutList, AlertCircle } from "lucide-react"

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = await props.searchParams
  const error = searchParams.error

  const getErrorMessage = (err: string) => {
    switch (err) {
      case 'OAuthAccountNotLinked':
        return 'To confirm your identity, please sign in with the same account you used originally (e.g., GitHub instead of Google).'
      case 'Signin':
      case 'OAuthSignin':
        return 'Could not start the sign-in process. Please try again.'
      case 'OAuthCallback':
        return 'There was a problem with the authentication provider. Please try again.'
      case 'OAuthCreateAccount':
        return 'Could not create a user account in the database.'
      case 'EmailCreateAccount':
        return 'Could not create a user account in the database.'
      case 'Callback':
        return 'There was a problem during the authentication process.'
      case 'UserRejected':
        return 'The sign-in request was rejected.'
      default:
        return 'An unexpected authentication error occurred.'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <LayoutList className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to OmniList</CardTitle>
          <CardDescription>
            Sign in to manage your tasks and media lists
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3 text-sm text-destructive mb-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{getErrorMessage(error)}</p>
            </div>
          )}

          <form
            action={async () => {
              "use server"
              await signIn("github", { redirectTo: "/" })
            }}
          >
            <Button className="w-full" variant="outline">
              Sign in with GitHub
            </Button>
          </form>
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/" })
            }}
          >
            <Button className="w-full" variant="outline">
              Sign in with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
