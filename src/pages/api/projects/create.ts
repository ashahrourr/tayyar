// pages/api/projects/create.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt } = req.body

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  const { data, error } = await supabase
    .from('projects')
    .insert([{ name: prompt, prompt }])
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    return res.status(500).json({ error: 'Failed to create project' })
  }

  return res.status(200).json({ id: data.id })
}
