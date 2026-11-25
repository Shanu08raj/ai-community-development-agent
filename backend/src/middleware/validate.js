import { ApiError } from '../utils/ApiError.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const raw = req[source];
    const parsed = schema.safeParse(raw);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        issue: issue.message,
      }));
      return next(new ApiError(422, 'VALIDATION_ERROR', 'Input validation failed.', details));
    }

    if (source === 'body') {
      req.body = parsed.data;
    } else if (source === 'query') {
      req.validatedQuery = parsed.data;
    } else if (source === 'params') {
      req.validatedParams = parsed.data;
    }

    return next();
  };
}
