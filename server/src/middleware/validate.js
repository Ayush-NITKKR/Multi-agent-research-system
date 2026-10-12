export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error.errors) {
      const messages = error.errors.map((e) => e.message);
      return res.status(400).json({
        success: false,
        error: messages.join(". "),
        details: error.errors,
      });
    }
    return res.status(400).json({
      success: false,
      error: "Invalid request payload.",
    });
  }
};
