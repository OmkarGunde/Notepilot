// api/health.js - Vercel Serverless Health Check
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'healthy',
    service: 'NotePilot Serverless Health Check',
    timestamp: new Date().toISOString()
  });
};
