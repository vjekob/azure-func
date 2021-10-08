# Vjeko.com Azure Function Helper

This project contains helper classes and types that make writing Azure Functions simpler and more consistent. It currently contains the following functionality:

| Type | Description |
|--|--|
| `Blob` | Simplifies most common operations with Blob storage |
| `RateLimiter` | Provides simple rate limiting functionality |
| `RequestBinder` | Replaces declarative `function.json` Blob binding with just-in-time late bound Blob bindings |
| `RequestHandler` | Strong-typed wrapper around request handler |
| `RequestValidator` | Validates incoming requests against pre-defined template |

The primary purpose of this project at this early stage is to provide core functionality to [AL Object ID Ninja](https://github.com/vjekob/al-objid) back end.

This documentation is mostly TODO.
