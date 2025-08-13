# TheBetterDay
## Starting Over Perfection - Failure-Friendly Goal Management App

[![Expo](https://img.shields.io/badge/Expo-SDK%2053-000020.svg?style=flat-square&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.79-61DAFB.svg?style=flat-square&logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)

## App Overview

An innovative mobile goal management app based on the philosophy of **"Starting Over Perfection"**.

With a unique approach that recognizes even 1 second of action as success, it's designed to help users start and consistently maintain goals without the burden of perfectionism.

## Key Features

### 🎯 Revolutionary Goal Management System
- **D+1 Logic**: Goal setting for tomorrow with ample preparation time
- **30-minute Unit Scheduling**: Precise time-based goal management
- **Failure-Friendly Approach**: Even 1 second of execution counts as success
- **Conflict Prevention**: Automatic detection and smart notifications for overlapping goals

### 🏆 Achievement System
- **9 Badge Categories**: Architecture, Butterfly, Pottery, Glasswork, Mountain, Seed, Publishing, Snow, Star
- **12-Level System**: Progressive growth with continuous motivation
- **Streak Tracking**: Consecutive success records for habit formation

### 🔔 Smart Notification System
- **3-Stage Notifications**: Prepare → Execute → Last Chance
- **Platform Optimization**: Native notifications optimized for iOS/Android
- **Personalization**: Customized messages with user names and goals

### 📱 User Experience
- **Offline First**: Full functionality without internet connection
- **Guest Mode**: Start immediately without signup
- **Auto Sync**: Seamless backup when connection is restored
- **Korean Optimized**: Complete Korean language interface

## Technology Stack

### 📱 Frontend
- **React Native 0.79.5** + TypeScript
- **Expo SDK 53.0.20** (Cross-platform)
- **Zustand** (State Management)
- **React Navigation 7** (Navigation)
- **React Native Calendars** (Calendar UI)
- **Lottie** (Animations)

### 🗄️ Backend
- **Supabase PostgreSQL** (Main Database)
- **Supabase Auth** + Google OAuth
- **Row Level Security** (Data Protection)
- **Real-time Subscriptions** (Live Updates)
- **Edge Functions** (Serverless Logic)

### 🛠️ Development Environment
- **Metro Bundler** (JavaScript Bundling)
- **EAS Build** (Cloud Building)
- **TypeScript Strict Mode** (Type Safety)
- **ESLint + Prettier** (Code Quality)

## Quick Start

### 1. Clone Repository and Install
```bash
git clone https://github.com/yourusername/TheBetterDay.git
cd TheBetterDay
npm install
```

### 2. Supabase Project Setup
1. Create new project at [Supabase](https://supabase.com)
2. Execute SQL from `database-functions.sql` file
3. Copy URL and anon key

### 3. Environment Variables Setup
Create `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run App
```bash
# Mobile testing (Recommended)
npx expo start --tunnel --go

# Web browser testing
npx expo start --web

# Development build (Advanced)
npx expo start --dev-client
```

### 5. QR Code Scan
- **Android**: Scan QR code with Expo Go app
- **iOS**: Scan QR code with Camera app

## Project Structure

```
TheBetterDay/
├── src/
│   ├── screens/          # Screen Components
│   │   ├── GoalListScreen.tsx     # Main Goal List
│   │   ├── ProfileSetupScreen.tsx  # Profile Setup
│   │   ├── HistoryScreen.tsx      # Goal History
│   │   └── SettingsScreen.tsx     # Settings
│   ├── components/       # Reusable UI Components
│   │   ├── TimePicker/           # Time Picker
│   │   ├── BadgeSystem/          # Badge System
│   │   └── NotificationManager/  # Notification Management
│   ├── store/           # State Management (Zustand)
│   │   ├── goalStore.ts          # Goal Management
│   │   ├── userStore.ts          # User Information
│   │   └── profileStore.ts       # Profile Management
│   ├── utils/           # Utility Functions
│   │   ├── dateUtils.ts          # Date Processing
│   │   ├── timeUtils.ts          # Time Processing
│   │   └── notificationUtils.ts  # Notification Processing
│   ├── types/           # TypeScript Types
│   └── constants/       # Constant Definitions
├── database-functions.sql # Supabase Functions
├── app.config.js         # Expo Configuration
├── eas.json             # Build Configuration
└── README.md            # Project Documentation
```

## Core Features Detail

### 🎯 Goal Management System
**D+1 Logic (Tomorrow First)**
- Set today, execute tomorrow system
- Provides ample preparation time and psychological comfort
- Automatic date calculation based on Korean timezone

**Time-Based Scheduling**
- Precise 30-minute unit time management
- Automatic detection of conflicting goals at same time
- Flexible time adjustment and modification

**Revolutionary Success Criteria**
- Even 1 second of execution = Success recognition
- Complete elimination of failure burden
- Value placed on the act of starting itself

### 🔔 Smart Notification System
**3-Stage Notification System**
- **15 minutes before**: "It's almost time to start" (Preparation stage)
- **On time**: "Start now!" (Execution stage)
- **15 minutes after**: "It's not too late yet" (Last chance)

**Personalized Messages**
- Includes user nickname
- Goal-specific customized messages
- Automatic motivational phrase generation

### 🏆 Badge and Achievement System
**9 Category-Specific Badges**
- Architecture (Systematic growth), Butterfly (Change & development)
- Pottery (Precision), Glasswork (Delicacy)
- Mountain (Grandeur), Seed (Growth potential)
- Publishing (Knowledge), Snow (Purity), Star (Dreams & goals)

**12-Level System**
- Progressive growth by stages
- Visual progress indication
- Clear goals to next level

### 🔐 Authentication and Security
**Multi-Authentication Support**
- Google OAuth social login
- Instant guest mode start
- Automatic session management and restoration

**Data Security**
- Supabase Row Level Security (RLS)
- Complete user data isolation
- Global nickname uniqueness guarantee

### 📲 Offline-First Design
**Complete Offline Operation**
- Full offline support for all core features
- Local AsyncStorage priority storage
- Real-time network status detection

**Automatic Synchronization**
- Immediate backup upon connection restoration
- Intelligent conflict resolution
- Data integrity guarantee

## Usage Guide

### Basic Usage Flow
1. **Getting Started**
   - Choose Google account login or guest mode
   - Set nickname and dream (Complete profile)

2. **Goal Setting**
   - Create goals with "Tomorrow's Tasks" button
   - Enter specific goal title
   - Select execution time in 30-minute units

3. **Execution and Completion**
   - Receive 3-stage notifications at set time
   - Even 1 second of execution counts as "Success"
   - Earn badges and accumulate streaks

4. **Performance Management**
   - Check completed goals in History tab
   - Review badge collection and level progress
   - End day with retrospective feature

### Core Usage Tips
- **Tomorrow Setting**: Plan today, execute tomorrow for preparation time
- **Small Goals**: Break large goals into 30-minute segments
- **Generous Standards**: Success if started, even if not perfect
- **Consistency**: Form habits through daily small success experiences

## Deployment and Build

### EAS Build Commands
```bash
# Development build
eas build --profile development --platform all

# Preview build (Internal testing)
eas build --profile preview --platform all

# Production build (App store deployment)
eas build --profile production --platform all
```

### App Store Deployment
```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

### Key Configuration Files
| File | Purpose |
|------|---------|
| `app.config.js` | Expo app basic configuration |
| `eas.json` | Build profile configuration |
| `metro.config.js` | Bundler optimization configuration |
| `database-functions.sql` | Supabase functions |

## Troubleshooting

### Common Issues
**When QR Code Scan Doesn't Work**
- Run in Expo Go mode: `npx expo start --go`
- Use tunnel mode: `npx expo start --tunnel`

**When Notifications Don't Come**
- Check device notification permissions
- Limited notification functionality in Expo Go environment

**When Data Doesn't Sync**
- Check network connection status
- Verify Supabase environment variable configuration

## Contributing and Development

This project is currently under individual development.

### Development Environment Setup
1. Install Node.js 18+ and npm
2. Install Expo CLI globally: `npm install -g @expo/cli`
3. Clone project and install dependencies
4. Set up Supabase project and configure environment variables

## License

MIT License - See LICENSE file for details.

---

**TheBetterDay** - Focus on starting over perfection, and create a slightly better tomorrow every day.