import { authService } from "../services/auth/auth.service.js";

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.json({
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    // req.user viene del middleware requireAuth
    const user = await authService.getMe(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
