function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
      });
    }
    req.validatedBody = result.data;
    return next();
  };
}

module.exports = { validate };
