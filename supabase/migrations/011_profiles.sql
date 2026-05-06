-- profiles: extends auth.users with role, subscription, login metadata
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT,
  full_name             TEXT,
  role                  TEXT        NOT NULL DEFAULT 'trial_user'
                          CHECK (role IN ('admin', 'paid_user', 'trial_user', 'blocked_user')),
  subscription_status   TEXT        NOT NULL DEFAULT 'none'
                          CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  trial_ends_at         TIMESTAMPTZ,
  stripe_customer_id    TEXT        UNIQUE,
  stripe_subscription_id TEXT       UNIQUE,
  subscription_period_end TIMESTAMPTZ,
  login_count           INT         NOT NULL DEFAULT 0,
  last_login_at         TIMESTAMPTZ,
  failed_login_attempts INT         NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "profiles_insert_trigger" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    now() + INTERVAL '14 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
