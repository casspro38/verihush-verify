import { supabase } from './supabase';

export async function checkUploadQuota() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { allowed: false, reason: 'Not logged in' };

    const userId = session.user.id;

    // Get user plan
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('id', session.user.id)
      .single();

    const plan = profile?.plan || 'free';

    if (plan === 'guard' || plan === 'proof') {
      return { allowed: true, plan, used: 0, limit: -1 };
    }

    // Free plan: 5 lifetime uploads
    const { count } = await supabase
      .from('evidence')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const used = count || 0;
    const limit = 5;

    return {
      allowed: used < limit,
      plan,
      used,
      limit,
      remaining: limit - used,
    };
  } catch (e) {
    console.log('Quota check error:', e);
    return { allowed: true, plan: 'free', used: 0, limit: 5 };
  }
}

export async function checkPdfQuota() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { allowed: false, reason: 'Not logged in' };

    const userId = session.user.id;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('id', session.user.id)
      .single();

    const plan = profile?.plan || 'free';

    if (plan === 'proof') {
      return { allowed: true, plan, used: 0, limit: -1 };
    }

    if (plan === 'guard') {
      // Monthly limit: 10
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth);

      const used = count || 0;
      return { allowed: used < 10, plan, used, limit: 10, remaining: 10 - used };
    }

    // Free plan: 99 for development (change back to 1 before release)
    const { count } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const used = count || 0;
    return { allowed: used < 99, plan, used, limit: 99, remaining: 99 - used };
  } catch (e) {
    console.log('PDF quota error:', e);
    return { allowed: true, plan: 'free', used: 0, limit: 1 };
  }
}

export async function checkStreamingAllowed() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { allowed: false };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('id', session.user.id)
      .single();

    const plan = profile?.plan || 'free';
    return { allowed: plan === 'guard' || plan === 'proof', plan };
  } catch (e) {
    console.log('Streaming check error:', e);
    return { allowed: false, plan: 'free' };
  }
}


