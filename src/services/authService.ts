import { getSupabaseClient } from '@/lib/supabase';
import { User, UserRole } from '@/types/mcu';
import bcrypt from 'bcryptjs';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export const defaultAdminUser: User = {
  id: 1,
  name: 'Administrator PTPN 3',
  email: 'admin@ptpn.co.id',
  nik: 'ADM-998811',
  divisi: 'Teknologi Informasi & SDM',
  role: 'admin',
};

/**
 * Login pengguna dengan memeriksa ke database Supabase (tabel users).
 * Mendukung login menggunakan Email maupun NIK, validasi role spesifik, dan hashing bcrypt.
 */
export async function loginWithSupabase(
  identifier: string,
  passwordInput: string,
  expectedRole?: UserRole
): Promise<AuthResult> {
  const client = getSupabaseClient();
  const trimmedId = identifier.trim();

  // Mode Fallback (Jika Supabase belum terhubung)
  if (!client) {
    let resolvedRole: UserRole = 'karyawan';
    const lower = trimmedId.toLowerCase();
    if (lower.includes('admin') || lower === 'admin@ptpn.co.id' || lower.startsWith('adm')) {
      resolvedRole = 'admin';
    } else if (lower.includes('klinik') || lower.includes('clinic') || lower.includes('dokter') || lower.startsWith('kln')) {
      resolvedRole = 'klinik';
    } else if (expectedRole) {
      resolvedRole = expectedRole;
    }

    const fallbackUser: User = {
      id: Date.now(),
      name: identifier.split('@')[0].toUpperCase(),
      email: identifier.includes('@') ? identifier : `${identifier}@ptpn.co.id`,
      nik: identifier.startsWith('EMP-') || identifier.startsWith('NIK-') || identifier.startsWith('ADM-') || identifier.startsWith('KLN-') ? identifier : `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      role: resolvedRole,
      divisi:
        resolvedRole === 'admin'
          ? 'Teknologi Informasi & SDM'
          : resolvedRole === 'klinik'
          ? 'Layanan Kesehatan'
          : 'Operasional Kebun',
    };
    return { success: true, user: fallbackUser };
  }

  try {
    // 1. Cari user di tabel mcu_users (atau users/profiles jika fallback)
    let userRow: any = null;
    
    // Coba dari tabel mcu_users terlebih dahulu
    const { data: mcuUserData, error: mcuUserErr } = await client
      .from('mcu_users')
      .select('*')
      .or(`email.ilike.${trimmedId},nik.ilike.${trimmedId}`)
      .maybeSingle();

    if (!mcuUserErr && mcuUserData) {
      userRow = mcuUserData;
    } else {
      // Coba tabel users
      const { data: userData, error: userErr } = await client
        .from('users')
        .select('*')
        .or(`email.ilike.${trimmedId},nik.ilike.${trimmedId}`)
        .maybeSingle();

      if (!userErr && userData) {
        userRow = userData;
      } else {
        // Fallback cek ke tabel profiles
        const { data: profileData } = await client
          .from('profiles')
          .select('*')
          .or(`email.ilike.${trimmedId},nik.ilike.${trimmedId}`)
          .maybeSingle();
        if (profileData) userRow = profileData;
      }
    }

    if (!userRow) {
      return {
        success: false,
        error: 'Akun tidak ditemukan. Silakan periksa kembali Email/NIK atau daftar akun baru.',
      };
    }

    // 2. Validasi Role (HARUS match dengan tab yang dipilih)
    if (expectedRole && userRow.role !== expectedRole) {
      return {
        success: false,
        error: `Peran tidak sesuai. Akun Anda terdaftar sebagai "${userRow.role.toUpperCase()}", tidak dapat masuk sebagai "${expectedRole.toUpperCase()}".`,
      };
    }

    // 3. Validasi Password (Bcrypt compare atau plain text fallback)
    let passwordMatch = false;
    if (userRow.password) {
      // Jika password disimpan sebagai bcrypt hash ($2a$ / $2b$ / $2y$)
      if (userRow.password.startsWith('$2')) {
        passwordMatch = bcrypt.compareSync(passwordInput, userRow.password);
      } else {
        // Plain text match fallback
        passwordMatch = userRow.password === passwordInput;
      }
    }

    if (!passwordMatch) {
      return {
        success: false,
        error: 'Kata Sandi salah. Silakan coba lagi.',
      };
    }

    const authenticatedUser: User = {
      id: Number(userRow.id),
      name: userRow.name,
      email: userRow.email,
      nik: userRow.nik || null,
      divisi: userRow.divisi || null,
      role: userRow.role as UserRole,
      created_at: userRow.created_at,
      updated_at: userRow.updated_at,
    };

    return { success: true, user: authenticatedUser };
  } catch (err: any) {
    console.error('Exception saat loginWithSupabase:', err);
    return {
      success: false,
      error: 'Terjadi kesalahan sistem saat memproses login.',
    };
  }
}

/**
 * Register akun baru ke database Supabase (tabel users) dengan password hash bcrypt.
 */
export async function registerWithSupabase(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  nik?: string;
  divisi?: string;
}): Promise<AuthResult> {
  const client = getSupabaseClient();
  const trimmedEmail = data.email.trim().toLowerCase();

  // Hash password menggunakan bcrypt
  const hashedPassword = bcrypt.hashSync(data.password, 10);

  if (!client) {
    const newUser: User = {
      id: Date.now(),
      name: data.name,
      email: trimmedEmail,
      nik: data.nik || null,
      divisi: data.divisi || null,
      role: data.role,
    };
    return { success: true, user: newUser };
  }

  try {
    // 1. Cek apakah email sudah terdaftar di mcu_users / users
    let existingUser: any = null;
    const { data: existMcu } = await client
      .from('mcu_users')
      .select('id, email')
      .ilike('email', trimmedEmail)
      .maybeSingle();
    if (existMcu) {
      existingUser = existMcu;
    } else {
      const { data: existOld } = await client
        .from('users')
        .select('id, email')
        .ilike('email', trimmedEmail)
        .maybeSingle();
      if (existOld) existingUser = existOld;
    }

    if (existingUser) {
      return {
        success: false,
        error: 'Email sudah terdaftar. Silakan gunakan email lain atau langsung login.',
      };
    }

    // 2. Cek apakah NIK sudah digunakan
    if (data.nik && data.nik.trim()) {
      let existingNik: any = null;
      const { data: existNikMcu } = await client
        .from('mcu_users')
        .select('id, nik')
        .ilike('nik', data.nik.trim())
        .maybeSingle();
      if (existNikMcu) {
        existingNik = existNikMcu;
      } else {
        const { data: existNikOld } = await client
          .from('users')
          .select('id, nik')
          .ilike('nik', data.nik.trim())
          .maybeSingle();
        if (existNikOld) existingNik = existNikOld;
      }

      if (existingNik) {
        return {
          success: false,
          error: 'NIK sudah terdaftar pada akun lain.',
        };
      }
    }

    // 3. Insert user baru ke tabel mcu_users (dengan fallback users/profiles)
    const userPayload = {
      name: data.name.trim(),
      email: trimmedEmail,
      password: hashedPassword,
      role: data.role,
      nik: data.nik?.trim() || null,
      divisi: data.divisi?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let insertedUser: any = null;
    const { data: newMcuData, error: insertMcuError } = await client
      .from('mcu_users')
      .insert(userPayload)
      .select()
      .single();

    if (!insertMcuError && newMcuData) {
      insertedUser = newMcuData;
    } else {
      // Coba tabel users
      const { data: newUserData, error: insertError } = await client
        .from('users')
        .insert(userPayload)
        .select()
        .single();

      if (!insertError && newUserData) {
        insertedUser = newUserData;
      } else {
        // Fallback coba insert ke profiles jika users belum ada
        const { data: profileData, error: profileErr } = await client
          .from('profiles')
          .insert({
            name: data.name.trim(),
            email: trimmedEmail,
            password: hashedPassword,
            role: data.role,
            nik: data.nik?.trim() || null,
            divisi: data.divisi?.trim() || null,
          })
          .select()
          .single();

        if (profileErr) {
          console.error('Error insert user profile:', profileErr.message);
          return {
            success: false,
            error: `Gagal menyimpan data akun: ${profileErr.message}`,
          };
        }
        insertedUser = profileData;
      }
    }

    const createdUser: User = {
      id: Number(insertedUser.id),
      name: insertedUser.name,
      email: insertedUser.email,
      nik: insertedUser.nik || null,
      divisi: insertedUser.divisi || null,
      role: insertedUser.role as UserRole,
      created_at: insertedUser.created_at,
      updated_at: insertedUser.updated_at,
    };

    return { success: true, user: createdUser };
  } catch (err: any) {
    console.error('Exception saat registerWithSupabase:', err);
    return {
      success: false,
      error: 'Terjadi kesalahan sistem saat mendaftarkan akun.',
    };
  }
}

/**
 * Update profil pengguna (nama, email, nik, divisi, atau password)
 */
export async function updateUserProfile(
  userId: number,
  data: {
    name?: string;
    email?: string;
    nik?: string;
    divisi?: string;
    avatar?: string | null;
    currentPassword?: string;
    newPassword?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: true };

  try {
    const updatePayload: Record<string, any> = {};
    if (data.name) updatePayload.name = data.name.trim();
    if (data.email) updatePayload.email = data.email.trim().toLowerCase();
    if (data.nik !== undefined) updatePayload.nik = data.nik ? data.nik.trim() : null;
    if (data.divisi !== undefined) updatePayload.divisi = data.divisi ? data.divisi.trim() : null;
    if (data.avatar !== undefined) {
      updatePayload.avatar = data.avatar;
      updatePayload.foto = data.avatar;
    }

    // Jika ingin ubah password
    if (data.newPassword) {
      if (!data.currentPassword) {
        return { success: false, error: 'Kata sandi saat ini harus diisi untuk mengubah password.' };
      }

      // Ambil user saat ini untuk cek current password dari mcu_users / users
      let currentDbUser: any = null;
      const { data: curMcuUser } = await client
        .from('mcu_users')
        .select('password')
        .eq('id', userId)
        .maybeSingle();

      if (curMcuUser) {
        currentDbUser = curMcuUser;
      } else {
        const { data: curUser } = await client
          .from('users')
          .select('password')
          .eq('id', userId)
          .maybeSingle();
        if (curUser) currentDbUser = curUser;
      }

      if (currentDbUser && currentDbUser.password) {
        const isCurrentMatch = currentDbUser.password.startsWith('$2')
          ? bcrypt.compareSync(data.currentPassword, currentDbUser.password)
          : currentDbUser.password === data.currentPassword;

        if (!isCurrentMatch) {
          return { success: false, error: 'Kata sandi saat ini tidak sesuai.' };
        }
      }

      updatePayload.password = bcrypt.hashSync(data.newPassword, 10);
    }

    updatePayload.updated_at = new Date().toISOString();

    // Coba update ke mcu_users terlebih dahulu
    const { error: errMcu } = await client
      .from('mcu_users')
      .update(updatePayload)
      .eq('id', userId);

    if (errMcu) {
      // Fallback update ke users
      const { error: errUser } = await client
        .from('users')
        .update(updatePayload)
        .eq('id', userId);

      if (errUser) {
        // Fallback ke profiles jika users belum ada
        await client.from('profiles').update(updatePayload).eq('id', userId);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memperbarui profil.' };
  }
}
