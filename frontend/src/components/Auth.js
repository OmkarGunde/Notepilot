// frontend/src/components/Auth.js

import React, { useState } from 'react';
import { supabase } from '../api/supabaseClient';
import {
  Box, Button, TextField, Typography, Paper, Alert, IconButton,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  Link, Divider
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

export default function Auth({ onDemoLogin }) {
  const [loadingAction, setLoadingAction] = useState(null); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Inline Validation & Alerts
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [statusAlert, setStatusAlert] = useState(null); // { text, severity }

  // Forgot password dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState(null);

  const validate = (isSignup = false) => {
    let valid = true;
    const cleanEmail = email.trim();

    if (!cleanEmail && !password) {
      setStatusAlert({
        text: isSignup ? 'Enter your email and password to create an account.' : 'Enter your email and password to sign in.',
        severity: 'error'
      });
      setEmailError('Enter your email');
      setPasswordError('Enter your password');
      return false;
    }

    if (!cleanEmail) {
      setEmailError('Enter your email');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError('Enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Enter your password');
      valid = false;
    } else if (isSignup && password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (valid) setStatusAlert(null);
    return valid;
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!validate(false)) return;

    setLoadingAction('login');
    setStatusAlert(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) {
        setStatusAlert({ text: error.message || 'Login failed. Please check your credentials.', severity: 'error' });
      }
    } catch (err) {
      setStatusAlert({ text: 'Unable to connect to authentication server.', severity: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSignup = async (e) => {
    if (e) e.preventDefault();
    if (!validate(true)) return;

    setLoadingAction('signup');
    setStatusAlert(null);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password
      });
      if (error) {
        setStatusAlert({ text: error.message || 'Signup failed.', severity: 'error' });
      } else {
        setStatusAlert({
          text: 'Account created! You can now sign in with your credentials.',
          severity: 'success'
        });
      }
    } catch (err) {
      setStatusAlert({ text: 'Unable to connect to authentication server.', severity: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
      setResetStatus({ text: 'Please enter a valid email address.', severity: 'error' });
      return;
    }
    setLoadingAction('reset');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: window.location.origin
      });
      if (error) {
        setResetStatus({ text: error.message, severity: 'error' });
      } else {
        setResetStatus({ text: 'Password reset link sent! Check your email inbox.', severity: 'success' });
      }
    } catch (err) {
      setResetStatus({ text: 'Failed to request reset. Please try again.', severity: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 440, mx: 'auto', mt: { xs: 4, md: 8 }, px: 2 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper' }}>
        
        {/* App Title & Subtitle */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component="img"
            src="/notepilot_logo.png"
            alt="NotePilot Logo"
            sx={{ height: 48, width: 48, borderRadius: '50%', mb: 1 }}
          />
          <Typography variant="h5" component="h1" fontWeight={700} color="primary" gutterBottom>
            NotePilot Login
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in or create an account.
          </Typography>
        </Box>

        {/* Inline Status Alert */}
        {statusAlert && (
          <Alert severity={statusAlert.severity} sx={{ mb: 2 }} role="alert">
            {statusAlert.text}
          </Alert>
        )}

        {/* Form Fields */}
        <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            error={Boolean(emailError)}
            helperText={emailError}
            disabled={loadingAction !== null}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            error={Boolean(passwordError)}
            helperText={passwordError}
            disabled={loadingAction !== null}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {/* Forgot Password Link */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => {
                setResetEmail(email.trim());
                setResetStatus(null);
                setResetDialogOpen(true);
              }}
              sx={{ textDecoration: 'none', cursor: 'pointer' }}
            >
              Forgot password?
            </Link>
          </Box>

          {/* Action Buttons: LOGIN and SIGN UP */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 2.5, mb: 1.5, py: 1.2, fontWeight: 700, textTransform: 'uppercase', minHeight: 44 }}
            disabled={loadingAction !== null}
          >
            {loadingAction === 'login' ? 'Logging in...' : 'LOGIN'}
          </Button>

          <Button
            type="button"
            fullWidth
            variant="outlined"
            onClick={handleSignup}
            sx={{ mb: 2, py: 1.2, fontWeight: 700, textTransform: 'uppercase', minHeight: 44 }}
            disabled={loadingAction !== null}
          >
            {loadingAction === 'signup' ? 'Signing up...' : 'SIGN UP'}
          </Button>

          {/* Quick Demo Access */}
          {onDemoLogin && (
            <>
              <Divider sx={{ my: 1.5 }}>
                <Typography variant="caption" color="text.secondary">OR</Typography>
              </Divider>

              <Button
                type="button"
                fullWidth
                variant="text"
                color="primary"
                startIcon={<PlayCircleOutlineIcon />}
                onClick={onDemoLogin}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Try Demo Workspace (No Account Needed)
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* Forgot Password Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your email address and we will send you a password reset link.
          </Typography>

          {resetStatus && (
            <Alert severity={resetStatus.severity} sx={{ mb: 2 }}>
              {resetStatus.text}
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            disabled={loadingAction === 'reset'}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetDialogOpen(false)} disabled={loadingAction === 'reset'}>
            Cancel
          </Button>
          <Button onClick={handleResetPassword} variant="contained" disabled={loadingAction === 'reset'}>
            {loadingAction === 'reset' ? 'Sending...' : 'Send Link'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}