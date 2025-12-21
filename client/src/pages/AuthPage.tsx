import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Check, X, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type LoginStep = "credentials" | "email-setup" | "verification" | "forgot-password" | "reset-password";
type RegisterStep = "form" | "verification";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("form");
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [verificationData, setVerificationData] = useState({ 
    userId: "", 
    email: "",
    newEmail: ""
  });
  const [verificationCode, setVerificationCode] = useState("");
  
  const [registerData, setRegisterData] = useState({ 
    username: "", 
    password: "", 
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: ""
  });

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showExistingAccountAlert, setShowExistingAccountAlert] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({ 
    email: "", 
    userId: "",
    maskedEmail: "",
    newPassword: "",
    confirmNewPassword: ""
  });
  const [resetPasswordErrors, setResetPasswordErrors] = useState<string[]>([]);

  const requestCodeMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/login/request-code", credentials);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.needsEmail) {
        setVerificationData({
          userId: data.userId,
          email: "",
          newEmail: ""
        });
        setLoginStep("email-setup");
      } else {
        setVerificationData({
          userId: data.userId,
          email: data.email,
          newEmail: ""
        });
        setLoginStep("verification");
        toast({
          title: "Code Sent",
          description: `A verification code has been sent to ${data.email}`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setEmailMutation = useMutation({
    mutationFn: async (data: { userId: string; email: string; username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/login/set-email", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setVerificationData({
        ...verificationData,
        email: data.email
      });
      setLoginStep("verification");
      toast({
        title: "Code Sent",
        description: `A verification code has been sent to ${data.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Set Email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async (data: { userId: string; code: string }) => {
      const res = await apiRequest("POST", "/api/login/verify-code", data);
      return await res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      setLocation("/owner/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
      setVerificationCode("");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; firstName: string; lastName: string; phone: string; email: string }) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const responseData = await res.json();
      if (!res.ok) {
        throw { ...responseData, status: res.status };
      }
      return responseData;
    },
    onSuccess: (data) => {
      if (data.needsVerification) {
        setVerificationData({
          userId: data.userId.toString(),
          email: data.email,
          newEmail: ""
        });
        setRegisterStep("verification");
        toast({
          title: "Account Created!",
          description: `Please check your email for a verification code sent to ${data.email}`,
        });
      }
    },
    onError: (error: any) => {
      if (error.existingAccount) {
        setShowExistingAccountAlert(true);
      } else {
        toast({
          title: "Registration Failed",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      }
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("POST", "/api/forgot-password/request", data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.userId) {
        setForgotPasswordData(prev => ({
          ...prev,
          userId: data.userId.toString(),
          maskedEmail: data.email
        }));
        setLoginStep("reset-password");
        toast({
          title: "Code Sent",
          description: `A reset code has been sent to ${data.email}`,
        });
      } else {
        toast({
          title: "Check Your Email",
          description: data.message,
        });
        setLoginStep("credentials");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [resetSuccessUsername, setResetSuccessUsername] = useState<string | null>(null);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { userId: string; code: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/forgot-password/reset", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setResetSuccessUsername(data.username);
      setLoginStep("credentials");
      setForgotPasswordData({ email: "", userId: "", maskedEmail: "", newPassword: "", confirmNewPassword: "" });
      setVerificationCode("");
    },
    onError: (error: Error) => {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
      setVerificationCode("");
    },
  });

  if (isLoading) {
    return null;
  }

  if (user) {
    return <Redirect to="/owner/dashboard" />;
  }

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/[a-zA-Z]/.test(password)) errors.push("At least one letter");
    if (!/[0-9]/.test(password)) errors.push("At least one number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("At least one symbol (!@#$%^&*)");
    return errors;
  };

  const handlePasswordChange = (password: string) => {
    setRegisterData({ ...registerData, password });
    setPasswordErrors(validatePassword(password));
  };

  const isPasswordValid = (password: string) => validatePassword(password).length === 0;

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    requestCodeMutation.mutate(loginData);
  };

  const handleEmailSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMutation.mutate({
      userId: verificationData.userId,
      email: verificationData.newEmail,
      username: loginData.username,
      password: loginData.password
    });
  };

  const handleVerifyCode = async (code: string) => {
    if (code.length === 6) {
      verifyCodeMutation.mutate({
        userId: verificationData.userId,
        code
      });
    }
  };

  const handleResendCode = () => {
    requestCodeMutation.mutate(loginData);
  };

  const handleBackToCredentials = () => {
    setLoginStep("credentials");
    setVerificationCode("");
    setVerificationData({ userId: "", email: "", newEmail: "" });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid(registerData.password)) {
      toast({
        title: "Invalid Password",
        description: "Please fix the password requirements listed below.",
        variant: "destructive"
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }

    registerMutation.mutate({
      username: registerData.username,
      password: registerData.password,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      phone: registerData.phone,
      email: registerData.email
    });
  };

  const handleResendRegisterCode = async () => {
    // Use the login endpoint to resend - user already exists
    const res = await apiRequest("POST", "/api/login/request-code", {
      username: registerData.username,
      password: registerData.password
    });
    const data = await res.json();
    if (data.email) {
      toast({
        title: "Code Sent",
        description: `A new verification code has been sent to ${data.email}`,
      });
    }
  };

  const handleBackToRegisterForm = () => {
    setRegisterStep("form");
    setVerificationCode("");
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPasswordMutation.mutate({ email: forgotPasswordData.email });
  };

  const handleResetPasswordChange = (password: string) => {
    setForgotPasswordData(prev => ({ ...prev, newPassword: password }));
    setResetPasswordErrors(validatePassword(password));
  };

  const handleResetPasswordSubmit = (code: string) => {
    if (code.length === 6 && isPasswordValid(forgotPasswordData.newPassword) && 
        forgotPasswordData.newPassword === forgotPasswordData.confirmNewPassword) {
      resetPasswordMutation.mutate({
        userId: forgotPasswordData.userId,
        code,
        newPassword: forgotPasswordData.newPassword
      });
    }
  };

  const handleBackFromForgotPassword = () => {
    setLoginStep("credentials");
    setForgotPasswordData({ email: "", userId: "", maskedEmail: "", newPassword: "", confirmNewPassword: "" });
    setVerificationCode("");
    setResetPasswordErrors([]);
  };

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <X className="w-4 h-4 text-muted-foreground" />
      )}
      <span className={met ? "text-green-600" : "text-muted-foreground"}>{text}</span>
    </div>
  );

  const renderLoginContent = () => {
    switch (loginStep) {
      case "credentials":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>
                Sign in to access your dashboard and manage bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="Enter your username"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    required
                    data-testid="input-login-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    data-testid="input-login-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={requestCodeMutation.isPending}
                  data-testid="button-login"
                >
                  {requestCodeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : "Continue"}
                </Button>
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={() => setLoginStep("forgot-password")}
                    data-testid="link-forgot-password"
                  >
                    Forgot Password?
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );

      case "forgot-password":
        return (
          <Card>
            <CardHeader>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-fit mb-2"
                onClick={handleBackFromForgotPassword}
                data-testid="button-back-from-forgot"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Reset Password
              </CardTitle>
              <CardDescription>
                Enter your email address and we'll send you a code to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email Address</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotPasswordData.email}
                    onChange={(e) => setForgotPasswordData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    data-testid="input-forgot-email"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={forgotPasswordMutation.isPending}
                  data-testid="button-send-reset-code"
                >
                  {forgotPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : "Send Reset Code"}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      case "reset-password":
        return (
          <Card>
            <CardHeader>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-fit mb-2"
                onClick={handleBackFromForgotPassword}
                data-testid="button-back-from-reset"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Create New Password
              </CardTitle>
              <CardDescription>
                Enter the code sent to {forgotPasswordData.maskedEmail} and create your new password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reset-new-password">New Password</Label>
                  <Input
                    id="reset-new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={forgotPasswordData.newPassword}
                    onChange={(e) => handleResetPasswordChange(e.target.value)}
                    required
                    data-testid="input-reset-new-password"
                  />
                  {forgotPasswordData.newPassword && (
                    <div className="space-y-1 pt-2">
                      <PasswordRequirement 
                        met={forgotPasswordData.newPassword.length >= 8} 
                        text="At least 8 characters" 
                      />
                      <PasswordRequirement 
                        met={/[a-zA-Z]/.test(forgotPasswordData.newPassword)} 
                        text="At least one letter" 
                      />
                      <PasswordRequirement 
                        met={/[0-9]/.test(forgotPasswordData.newPassword)} 
                        text="At least one number" 
                      />
                      <PasswordRequirement 
                        met={/[!@#$%^&*(),.?":{}|<>]/.test(forgotPasswordData.newPassword)} 
                        text="At least one symbol (!@#$%^&*)" 
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-confirm-password">Confirm New Password</Label>
                  <Input
                    id="reset-confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={forgotPasswordData.confirmNewPassword}
                    onChange={(e) => setForgotPasswordData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                    required
                    data-testid="input-reset-confirm-password"
                  />
                  {forgotPasswordData.confirmNewPassword && forgotPasswordData.newPassword !== forgotPasswordData.confirmNewPassword && (
                    <p className="text-sm text-destructive">Passwords do not match</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Enter Verification Code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={verificationCode}
                      onChange={(value) => {
                        setVerificationCode(value);
                        handleResetPasswordSubmit(value);
                      }}
                      disabled={resetPasswordMutation.isPending || !isPasswordValid(forgotPasswordData.newPassword) || forgotPasswordData.newPassword !== forgotPasswordData.confirmNewPassword}
                      data-testid="input-reset-code"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {(!isPasswordValid(forgotPasswordData.newPassword) || forgotPasswordData.newPassword !== forgotPasswordData.confirmNewPassword) && (
                    <p className="text-sm text-muted-foreground text-center">
                      Complete password fields to enter code
                    </p>
                  )}
                </div>
                
                {resetPasswordMutation.isPending && (
                  <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the code?
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => forgotPasswordMutation.mutate({ email: forgotPasswordData.email })}
                    disabled={forgotPasswordMutation.isPending}
                    data-testid="button-resend-reset-code"
                  >
                    {forgotPasswordMutation.isPending ? "Sending..." : "Resend Code"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "email-setup":
        return (
          <Card>
            <CardHeader>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-fit mb-2"
                onClick={handleBackToCredentials}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Set Up Email Verification
              </CardTitle>
              <CardDescription>
                For security, we need to send verification codes to your email. Please enter your email address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="setup-email">Email Address</Label>
                  <Input
                    id="setup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={verificationData.newEmail}
                    onChange={(e) => setVerificationData({ ...verificationData, newEmail: e.target.value })}
                    required
                    data-testid="input-setup-email"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={setEmailMutation.isPending}
                  data-testid="button-save-email"
                >
                  {setEmailMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : "Save & Send Code"}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      case "verification":
        return (
          <Card>
            <CardHeader>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-fit mb-2"
                onClick={handleBackToCredentials}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Enter Verification Code
              </CardTitle>
              <CardDescription>
                We sent a 6-digit code to {verificationData.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={(value) => {
                      setVerificationCode(value);
                      handleVerifyCode(value);
                    }}
                    disabled={verifyCodeMutation.isPending}
                    data-testid="input-verification-code"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                
                {verifyCodeMutation.isPending && (
                  <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the code?
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleResendCode}
                    disabled={requestCodeMutation.isPending}
                    data-testid="button-resend-code"
                  >
                    {requestCodeMutation.isPending ? "Sending..." : "Resend Code"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  const handleSwitchToLogin = () => {
    setShowExistingAccountAlert(false);
    // Find and click the login tab
    const loginTab = document.querySelector('[data-testid="tab-login"]') as HTMLElement;
    if (loginTab) loginTab.click();
  };

  return (
    <>
      <AlertDialog open={showExistingAccountAlert} onOpenChange={setShowExistingAccountAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              It looks like there's already an account with this email address. Would you like to sign in instead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-existing">Try Different Email</AlertDialogCancel>
            <AlertDialogAction onClick={handleSwitchToLogin} data-testid="button-go-to-login">
              Sign In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resetSuccessUsername} onOpenChange={() => setResetSuccessUsername(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Password Reset Successful
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Your password has been reset successfully!</p>
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Your username is:</p>
                <p className="text-lg font-semibold text-foreground">{resetSuccessUsername}</p>
              </div>
              <p className="text-sm">Use this username with your new password to log in.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setResetSuccessUsername(null)} 
              data-testid="button-reset-success-ok"
            >
              Got it, Log In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen flex">
        <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold font-['Poppins']">Foam Works Party Co</h1>
              </div>
              <p className="text-muted-foreground">Owner Portal Access</p>
            </div>

            <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {renderLoginContent()}
            </TabsContent>

            <TabsContent value="register">
              {registerStep === "form" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Create Account</CardTitle>
                    <CardDescription>
                      Set up your owner account to start managing bookings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-firstname">First Name</Label>
                          <Input
                            id="register-firstname"
                            type="text"
                            placeholder="John"
                            value={registerData.firstName}
                            onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                            required
                            data-testid="input-register-firstname"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-lastname">Last Name</Label>
                          <Input
                            id="register-lastname"
                            type="text"
                            placeholder="Doe"
                            value={registerData.lastName}
                            onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                            required
                            data-testid="input-register-lastname"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="you@example.com"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          required
                          data-testid="input-register-email"
                        />
                        <p className="text-xs text-muted-foreground">
                          Used for verification codes when logging in
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-username">Username</Label>
                        <Input
                          id="register-username"
                          type="text"
                          placeholder="Choose a username"
                          value={registerData.username}
                          onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                          required
                          data-testid="input-register-username"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-phone">Phone Number</Label>
                        <Input
                          id="register-phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={registerData.phone}
                          onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                          required
                          data-testid="input-register-phone"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-password">Password</Label>
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="Create a strong password"
                          value={registerData.password}
                          onChange={(e) => handlePasswordChange(e.target.value)}
                          required
                          data-testid="input-register-password"
                        />
                        <div className="mt-2 p-3 bg-muted rounded-md space-y-1">
                          <p className="text-xs font-medium mb-2">Password must have:</p>
                          <PasswordRequirement 
                            met={registerData.password.length >= 8} 
                            text="At least 8 characters" 
                          />
                          <PasswordRequirement 
                            met={/[a-zA-Z]/.test(registerData.password)} 
                            text="At least one letter (a-z, A-Z)" 
                          />
                          <PasswordRequirement 
                            met={/[0-9]/.test(registerData.password)} 
                            text="At least one number (0-9)" 
                          />
                          <PasswordRequirement 
                            met={/[!@#$%^&*(),.?":{}|<>]/.test(registerData.password)} 
                            text="At least one symbol (!@#$%^&*)" 
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Example: Foam2024!
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-confirm-password">Confirm Password</Label>
                        <Input
                          id="register-confirm-password"
                          type="password"
                          placeholder="Re-enter your password"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          required
                          data-testid="input-register-confirm-password"
                        />
                        {registerData.confirmPassword && registerData.password !== registerData.confirmPassword && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <X className="w-4 h-4" /> Passwords do not match
                          </p>
                        )}
                        {registerData.confirmPassword && registerData.password === registerData.confirmPassword && (
                          <p className="text-sm text-green-600 flex items-center gap-1">
                            <Check className="w-4 h-4" /> Passwords match
                          </p>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending || !isPasswordValid(registerData.password) || registerData.password !== registerData.confirmPassword}
                        data-testid="button-register"
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-fit mb-2"
                      onClick={handleBackToRegisterForm}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Verify Your Email
                    </CardTitle>
                    <CardDescription>
                      We sent a 6-digit code to {verificationData.email}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={verificationCode}
                          onChange={(value) => {
                            setVerificationCode(value);
                            handleVerifyCode(value);
                          }}
                          disabled={verifyCodeMutation.isPending}
                          data-testid="input-register-verification-code"
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      
                      {verifyCodeMutation.isPending && (
                        <div className="flex justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}

                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Didn't receive the code?
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleResendRegisterCode}
                          data-testid="button-resend-register-code"
                        >
                          Resend Code
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-8">
        <div className="max-w-md space-y-6 text-center">
          <Sparkles className="w-16 h-16 text-primary mx-auto" />
          <h2 className="text-3xl font-bold font-['Poppins']">
            Foaming Around and Find Out
          </h2>
          <p className="text-lg text-muted-foreground">
            Manage your foam party rental business with our comprehensive owner portal. 
            Track bookings, view your calendar, and manage event statuses all in one place.
          </p>
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-muted-foreground">
                Dashboard with real-time stats and revenue tracking
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-muted-foreground">
                Calendar view to manage event schedules
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-muted-foreground">
                Kanban board for workflow management
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-muted-foreground">
                Secure email verification for login
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
