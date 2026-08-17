const requireAdmin = (req, res, next) => {
  if (req.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const requireClient = (req, res, next) => {
  if (req.role !== 'client' || !req.assignmentId) {
    return res.status(403).json({ message: 'Client access required' });
  }
  next();
};

module.exports = { requireAdmin, requireClient };
