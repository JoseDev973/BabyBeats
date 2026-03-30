"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import SongCard from "@/components/songs/SongCard";
import type { Song, Category } from "@/types/database";
import { Search } from "lucide-react";

interface SongCatalogProps {
  songs: Song[];
  categories: Category[];
  isPremiumUser: boolean;
}

const AGE_RANGES = [
  { value: "all", label: "All" },
  { value: "0-6m", label: "0-6 months" },
  { value: "6-12m", label: "6-12 months" },
  { value: "1-2y", label: "1-2 years" },
  { value: "2-3y", label: "2-3 years" },
];

const LANGUAGES = [
  { value: "all", label: "All" },
  { value: "es", label: "Espa\u00f1ol" },
  { value: "en", label: "English" },
  { value: "pt", label: "Portugu\u00eas" },
  { value: "fr", label: "Fran\u00e7ais" },
];

export default function SongCatalog({
  songs,
  categories,
  isPremiumUser,
}: SongCatalogProps) {
  const t = useTranslations("songs");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchesSearch = song.title
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || song.category_id === categoryFilter;
      const matchesLanguage =
        languageFilter === "all" || song.language === languageFilter;
      const matchesAge =
        ageFilter === "all" ||
        song.age_range === ageFilter ||
        song.age_range === "all";
      return matchesSearch && matchesCategory && matchesLanguage && matchesAge;
    });
  }, [songs, search, categoryFilter, languageFilter, ageFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold mb-8">{t("catalog")}</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("catalog")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">{t("allCategories")}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>

        <select
          value={ageFilter}
          onChange={(e) => setAgeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {AGE_RANGES.map((age) => (
            <option key={age.value} value={age.value}>
              {age.label}
            </option>
          ))}
        </select>
      </div>

      {/* Song list */}
      {filteredSongs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">{t("noResults")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              queue={filteredSongs}
              isPremiumUser={isPremiumUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}
