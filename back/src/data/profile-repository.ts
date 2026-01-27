import { createUserClient, supabaseAdmin } from '../lib/supabase.js';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileDTO {
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

const TABLE = 'profiles';

export async function getProfileByUserId(
  userId: string,
  accessToken: string
): Promise<Profile | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    throw new Error(`Erro ao buscar perfil: ${error.message}`);
  }

  return data;
}

export async function upsertProfile(
  userId: string,
  updates: UpdateProfileDTO,
  accessToken: string
): Promise<Profile> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .upsert(
      {
        id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar perfil: ${error.message}`);
  }

  return data;
}

export async function getAvatarUploadUrl(
  userId: string,
  fileName: string
): Promise<{ signedUrl: string; path: string }> {
  const path = `${userId}/${fileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .createSignedUploadUrl(path);

  if (error) {
    throw new Error(`Erro ao gerar URL de upload: ${error.message}`);
  }

  return {
    signedUrl: data.signedUrl,
    path,
  };
}

export async function deleteAvatar(
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // List all files in user's folder
  const { data: files, error: listError } = await supabaseAdmin.storage
    .from('avatars')
    .list(userId);

  if (listError) {
    throw new Error(`Erro ao listar avatares: ${listError.message}`);
  }

  if (files && files.length > 0) {
    const filePaths = files.map((file: { name: string }) => `${userId}/${file.name}`);
    const { error: deleteError } = await supabaseAdmin.storage
      .from('avatars')
      .remove(filePaths);

    if (deleteError) {
      throw new Error(`Erro ao deletar avatar: ${deleteError.message}`);
    }
  }

  // Clear avatar_url in profile
  await client
    .from(TABLE)
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', userId);
}

export function getPublicAvatarUrl(path: string): string {
  const supabaseUrl = process.env.SUPABASE_URL!;
  return `${supabaseUrl}/storage/v1/object/public/avatars/${path}`;
}
