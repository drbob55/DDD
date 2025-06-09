// FILE 1: pages/api/clinics/index.ts
// This handles GET (list all) and POST (create new) for clinics

import { NextApiRequest, NextApiResponse } from 'next';

// For now, we'll use in-memory storage (replace with your database later)
// In production, replace this with your database queries
let clinics = [
  {
    id: '1',
    name: 'Main Clinic',
    address: '123 Main Street, City, State 12345',
    phone: '+1-555-0123',
    email: 'main@clinic.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return handleGetClinics(req, res);
      case 'POST':
        return handleCreateClinic(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/clinics - List all clinics
async function handleGetClinics(req: NextApiRequest, res: NextApiResponse) {
  try {
    // In production, replace with database query:
    // const clinics = await db.clinic.findMany();
    
    return res.status(200).json({
      success: true,
      clinics: clinics,
      count: clinics.length
    });
  } catch (error) {
    console.error('Error fetching clinics:', error);
    return res.status(500).json({ error: 'Failed to fetch clinics' });
  }
}

// POST /api/clinics - Create new clinic
async function handleCreateClinic(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, address, phone, email } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Clinic name is required' });
    }

    // Check if clinic with same name already exists
    const existingClinic = clinics.find(clinic => 
      clinic.name.toLowerCase() === name.trim().toLowerCase()
    );
    
    if (existingClinic) {
      return res.status(409).json({ error: 'A clinic with this name already exists' });
    }

    // Validate email format if provided
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Create new clinic
    const newClinic = {
      id: Date.now().toString(), // In production, use UUID or auto-increment ID
      name: name.trim(),
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In production, replace with database insert:
    // const clinic = await db.clinic.create({ data: newClinic });
    clinics.push(newClinic);

    return res.status(201).json({
      success: true,
      message: 'Clinic created successfully',
      clinic: newClinic
    });
  } catch (error) {
    console.error('Error creating clinic:', error);
    return res.status(500).json({ error: 'Failed to create clinic' });
  }
}