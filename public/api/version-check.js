// Simple API endpoint for version checking
// This would normally be a server-side endpoint, but for demo purposes we'll simulate it

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In a real application, this would check against a remote server
    // For now, we'll simulate version checking
    const currentVersion = '1.0.0';
    const latestVersion = '1.0.1'; // Simulate newer version
    
    const updateAvailable = currentVersion !== latestVersion;
    
    return res.status(200).json({
      currentVersion,
      latestVersion,
      updateAvailable,
      releaseDate: new Date().toISOString(),
      changelog: [
        'إصلاح مشاكل الأداء',
        'تحسين واجهة المستخدم',
        'ميزات أمان جديدة'
      ]
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check version' });
  }
}
