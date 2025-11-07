// frontend/src/components/Auth.js

import React, { useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { Box, Button, TextField, Typography } from '@mui/material';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.error_description || error.message);
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.error_description || error.message);
    else alert('Signup successful! Check your email to verify.');
    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 10, p: 3, boxShadow: 3, borderRadius: 2 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        NotePilot Login
      </Typography>
      <Typography>Sign in or create an account.</Typography>
      <Box component="form" noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal" required fullWidth id="email"
          label="Email Address" name="email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          margin="normal" required fullWidth name="password"
          label="Password" type="password" id="password"
          autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          type="submit" fullWidth variant="contained"
          sx={{ mt: 3, mb: 1 }} disabled={loading} onClick={handleLogin}
        >
          {loading ? 'Loading...' : 'Login'}
        </Button>
        <Button
          type="submit" fullWidth variant="outlined"
          sx={{ mb: 2 }} disabled={loading} onClick={handleSignup}
        >
          {loading ? 'Loading...' : 'Sign Up'}
        </Button>
      </Box>
    </Box>
  );
}