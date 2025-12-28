# Gudang FE

A modern warehouse management frontend application built with Vue 3, TypeScript, and PrimeVue. This application provides a comprehensive interface for managing users, roles, permissions, and warehouse operations with built-in internationalization and responsive design.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development](#development)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Internationalization](#internationalization)
- [Contributing](#contributing)
- [License](#license)

## Features

- **User Management**: Complete CRUD operations for user accounts
- **Role-Based Access Control**: Manage roles and permissions
- **Responsive Design**: Mobile-first design that works seamlessly on all devices
- **Internationalization**: Support for English (US) and Bahasa Indonesia
- **Apache Superset Integration**: Embedded BI dashboards
- **Type-Safe**: Built with TypeScript for enhanced developer experience
- **Modern UI**: Beautiful interface powered by PrimeVue and TailwindCSS

## Tech Stack

### Core Framework
- **Vue 3** - Progressive JavaScript framework with Composition API
- **TypeScript** - Type-safe JavaScript
- **Vite** - Next-generation frontend build tool

### UI & Styling
- **PrimeVue 4** - Rich UI component library (Aura theme)
- **TailwindCSS v4** - Utility-first CSS framework
- **PrimeIcons** - Icon library

### State & Routing
- **Pinia** - Vue state management
- **Vue Router** - Official Vue.js router with lazy loading

### Data & Validation
- **Axios** - HTTP client with interceptors
- **Zod** - TypeScript-first schema validation
- **@primevue/forms** - Form management

### Additional Libraries
- **Vue I18n** - Internationalization plugin
- **@vueuse/core** - Collection of Vue Composition utilities
- **dayjs** - Date manipulation library
- **@superset-ui/embedded-sdk** - Apache Superset integration

### Development Tools
- **Vitest** - Unit testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **vue-tsc** - TypeScript type checking for Vue

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v22.x or higher
- **npm**: v10.x or higher (comes with Node.js)
- **Git**: For version control

Check your versions:
```bash
node --version
npm --version
git --version
```

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd gudang-fe
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the sample environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set the API base URL:

```env
VITE_API_BASE_URL=http://localhost:8080
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

## Development

### Available Scripts

```bash
# Start development server with hot-reload
npm run dev

# Run tests in watch mode
npm run test:unit

# Type checking
npm run type-check

# Build for production (includes type-check)
npm run build

# Build only (without type-check)
npm run build-only

# Preview production build
npm run preview

# Lint and auto-fix
npm run lint

# Format code with Prettier
npm run format
```

### Development Workflow

1. **Start the dev server**: `npm run dev`
2. **Make changes**: Edit files in `src/`
3. **Test your changes**: `npm run test:unit`
4. **Check types**: `npm run type-check`
5. **Lint your code**: `npm run lint`
6. **Format code**: `npm run format`

### Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension (disable Vetur if installed)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) extension

## Project Structure

```
gudang-fe/
├── src/
│   ├── views/              # Page-level components
│   │   ├── users/          # User management pages
│   │   ├── roles/          # Role management pages
│   │   ├── permissions/    # Permission management pages
│   │   └── ...
│   ├── components/         # Reusable UI components
│   │   ├── table/          # Generic table component
│   │   ├── button/         # Button components
│   │   ├── card/           # Card components
│   │   ├── menu/           # Navigation components
│   │   └── dialog/         # Modal dialogs
│   ├── composables/        # Reusable composition functions
│   │   ├── useConfirmDelete.ts
│   │   ├── useDialog.ts
│   │   └── useResponsiveSize.ts
│   ├── services/           # API services and utilities
│   │   ├── api.ts          # Base HTTP service
│   │   ├── users.service.ts
│   │   ├── roles.service.ts
│   │   └── ...
│   ├── types/              # TypeScript type definitions
│   │   ├── api.type.ts
│   │   ├── user.type.ts
│   │   ├── role.type.ts
│   │   └── ...
│   ├── constants/          # Application constants
│   │   ├── api.ts          # API endpoints
│   │   ├── dateFormat.ts
│   │   └── ...
│   ├── i18n/               # Internationalization
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── en-US.ts
│   │       └── id-ID.ts
│   ├── stores/             # Pinia state stores
│   ├── router/             # Vue Router configuration
│   ├── utils/              # Utility functions
│   └── App.vue             # Root component
├── .claude/                # Claude Code configuration
│   └── CLAUDE.md           # Detailed architecture documentation
├── .env                    # Environment variables (not in git)
├── .env.example            # Sample environment file
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project dependencies
```

## Architecture

### Key Architectural Patterns

#### 1. Service Layer Pattern
All API calls are centralized in service classes:
- Singleton `ApiService` for HTTP operations
- Static service classes (e.g., `UsersService`, `RolesService`)
- API endpoints centralized in `src/constants/api.ts`

```typescript
import { UsersService } from '@/services'

// Example: Delete a user
await UsersService.delete(userId)
```

#### 2. Composables Pattern
Reusable composition functions for common logic:
- `useConfirmDelete`: Delete confirmation dialog pattern
- `useDialog`: Dialog visibility state management
- `useResponsiveSize`: Responsive breakpoint detection

#### 3. Generic Table Component
Reusable `TableComponent.vue` with built-in:
- Server-side pagination, sorting, and filtering
- Responsive design (cards on mobile, table on desktop)
- Search with debounce
- Configurable columns

#### 4. Barrel Exports
Clean imports via `index.ts` files:
```typescript
// Instead of multiple imports:
import { UsersService } from '@/services/users.service'
import { RolesService } from '@/services/roles.service'

// Use barrel exports:
import { UsersService, RolesService } from '@/services'
```

For detailed architecture documentation, see [.claude/CLAUDE.md](.claude/CLAUDE.md).

## Internationalization

The application supports multiple languages:

- **English (US)** - Default locale
- **Bahasa Indonesia** - Indonesian translation

### How It Works

- Language preference is saved to `localStorage`
- Automatic detection: localStorage → browser language → default (en-US)
- All UI text is translatable via Vue I18n
- Runtime language switching via header component

### Adding Translations

1. Add keys to both `src/i18n/locales/en-US.ts` and `src/i18n/locales/id-ID.ts`
2. Use `t()` function in components:
   ```vue
   <script setup lang="ts">
   import { useI18n } from 'vue-i18n'
   const { t } = useI18n()
   </script>

   <template>
     <h1>{{ t('users.title') }}</h1>
   </template>
   ```

## Contributing

### Development Guidelines

1. **Read the Architecture Documentation**: Review [.claude/CLAUDE.md](.claude/CLAUDE.md) before contributing
2. **Follow TypeScript Best Practices**:
   - NEVER use `any` type - use proper types or `unknown`
   - Define interfaces for all data structures
   - Use generics when appropriate
3. **Responsive Design**: Use mobile-first approach with TailwindCSS breakpoints
4. **Code Style**:
   - Run `npm run lint` and `npm run format` before committing
   - Follow existing patterns in the codebase
5. **Testing**: Write unit tests for new features and bug fixes
6. **Commits**: Write clear, descriptive commit messages

### Adding New CRUD Views

When adding a new entity (e.g., Products, Orders):

1. **Define Types**: Create `src/types/[entity].type.ts`
2. **Create Service**: Create `src/services/[entity].service.ts`
3. **Add Endpoint**: Add to `src/constants/api.ts`
4. **Create Views**:
   - `src/views/[entity]/[Entity]View.vue` (main view with table)
   - `src/views/[entity]/[Entity]Dialog.vue` (create/edit dialog)
5. **Add Routing**: Add route to `src/router/index.ts`
6. **Add Navigation**: Add menu entry to `src/components/menu/menu.ts`
7. **Add Translations**: Add i18n keys to both locale files

See [.claude/CLAUDE.md#when-adding-new-crud-views](.claude/CLAUDE.md#when-adding-new-crud-views) for detailed templates.

### Git Workflow

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes and commit: `git commit -m "feat: add your feature"`
3. Push to the branch: `git push origin feature/your-feature-name`
4. Create a Pull Request

### Commit Message Convention

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## License

[Specify your license here]

---

**Happy coding!** If you have questions, check [.claude/CLAUDE.md](.claude/CLAUDE.md) for detailed architecture documentation.
