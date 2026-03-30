# 📱 TechFlow - L'application de Veille Technologique Interactive

![React](https://img.shields.io/badge/React-18-blue.svg)
![Vite](https://img.shields.io/badge/Vite-5-purple.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC.svg)
![Python](https://img.shields.io/badge/Python-FastAPI-green.svg)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)

## 📝 Présentation du projet
**TechFlow** est une application web innovante de veille technologique qui réinvente la façon de consommer l'actualité tech. Inspirée par les interfaces de type "Swipe" (à la Tinder), elle agrège des flux RSS, utilise l'intelligence artificielle (OpenAI) pour résumer les articles en cartes interactives, et permet aux utilisateurs de balayer l'actualité pour sauvegarder ce qui les intéresse.

## ✨ Fonctionnalités Principales
- 👆 **Interface "Swipe" :** Balayez les cartes d'actualité de manière fluide (animations avec Framer Motion). Glissez à droite pour sauvegarder, à gauche pour ignorer.
- 🤖 **Résumés par IA :** Transformation d'articles longs en résumés concis ("Snackable content") via l'API OpenAI.
- 📰 **Agrégation RSS :** Récupération automatique des dernières actualités depuis des sources tech majeures.
- 🏷️ **Filtres par thématiques :** Sélection personnalisée des sujets d'actualité (IA, Web, Cloud, Sécurité, etc.) via le composant `TopicSelector`.
- 🔖 **Liste de lecture :** Un espace dédié pour retrouver tous les articles sauvegardés et consulter les sources originales.

## 🛠️ Architecture Technique
Le projet repose sur une architecture découplée (Frontend / Backend) :
- **Frontend (`/frontend`) :** - Application SPA en **React.js** générée avec **Vite**.
  - Interface moderne et responsive stylisée avec **Tailwind CSS**.
  - Moteur d'animations physiques géré par **Framer Motion**.
- **Backend (`/backend`) :** - API REST asynchrone développée en **Python** avec le framework **FastAPI**.
  - Base de données légère **SQLite** (`techflow.db`) gérée via requêtes natives.
  - Intégration de la librairie `feedparser` pour la lecture des flux et du SDK `openai` pour le NLP.
- **Déploiement :** Configuration **Docker** complète (`docker-compose.yml`, `Dockerfile` front et back) incluant un serveur Nginx pour le frontend.

## 🚀 Installation & Exécution

### Prérequis
- [Docker](https://www.docker.com/) et Docker Compose installés sur votre machine.
- Une clé API OpenAI valide.

### Configuration
1. Clonez le dépôt sur votre machine locale.
2. Allez dans le dossier `backend` et configurez les variables d'environnement :
   ```bash
   cd backend
   cp .env.example .env
