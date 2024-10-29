# Connect Four Monorepo

A monorepo containing multiple implementations of Connect Four using modern web technologies.

## Live Demo
[Try it here](https://server-component-connect-four.vercel.app/)

## Features

- Built with Next.js and React Server Components
- Zero client-side JavaScript required
- Smooth Tailwind CSS animations
- Two game engine implementations:
  - JavaScript version
  - Rust version (compiled to WebAssembly)

## Technical Details

### Server Components Implementation
The primary implementation uses Next.js with React Server Components. The application works entirely without client-side JavaScript, demonstrating the power of server-side rendering. While this showcases an interesting use case for Server Components, it doesn't fully utilize advanced features like streaming or complex data fetching patterns.

All game state is stored and managed through URL parameters, using the JSONcrush library to compress and deserialize the state data. This approach enables a completely stateless application while maintaining a shareable game state through URLs.

### Performance Measurement
Due to the limitations of timing APIs in edge runtime environments, a custom `EdgeTimer` utility was implemented as a workaround to measure performance. The utility makes API calls to record timestamps, as server timers are only updated after completed fetch requests. This approach, while not ideal, allows for basic performance monitoring in environments where direct access to timing APIs is restricted for security reasons.

### Rust/WebAssembly Implementation
Due to performance considerations, a second implementation was created using Rust, located in `/packages/connect_four_rust`. This version is compiled to WebAssembly and can be selected as an alternative engine on the deployed site.

### Performance Notes
- The Rust/WASM version shows significant performance improvements in local development
- When deployed to Vercel Edge Functions, both versions perform similarly due to WASM overhead
- Performance profiling is challenging in the edge runtime environment due to Cloudflare Workers' security restrictions on timing APIs (implemented to prevent Spectre attacks)
  - [Learn more about Cloudflare Workers' Performance APIs](https://developers.cloudflare.com/workers/runtime-apis/performance/)

## Getting Started