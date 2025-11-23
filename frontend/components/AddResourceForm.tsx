"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function AddResourceForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    baseUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create resource");
      }

      setSuccess(true);
      setFormData({ name: "", description: "", baseUrl: "" });

      // Reload page to show new resource
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-highlight text-primary px-4 py-2 rounded-lg hover:bg-highlight/90 transition"
      >
        + Add New Resource
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-default border border-contrast rounded-lg p-6 shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-primary">
              Add New x402 Resource
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-primary/70 hover:text-primary transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-primary/80">
                Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full border border-contrast rounded px-3 py-2 bg-background text-primary placeholder:text-primary/40 focus:outline-none focus:border-highlight"
                placeholder="Weather API"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-primary/80">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full border border-contrast rounded px-3 py-2 bg-background text-primary placeholder:text-primary/40 focus:outline-none focus:border-highlight"
                placeholder="Get weather forecasts for any location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-primary/80">
                Base URL <span className="text-error">*</span>
              </label>
              <input
                type="url"
                required
                value={formData.baseUrl}
                onChange={(e) =>
                  setFormData({ ...formData, baseUrl: e.target.value })
                }
                className="w-full border border-contrast rounded px-3 py-2 bg-background text-primary placeholder:text-primary/40 focus:outline-none focus:border-highlight"
                placeholder="https://windybay.okay3.xyz"
              />
              <p className="text-xs text-primary/50 mt-1">
                The system will automatically fetch /.well-known/x402 to get
                payment details
              </p>
            </div>

            {error && (
              <div className="bg-error/20 border border-error text-error px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-success/20 border border-success text-success px-4 py-3 rounded">
                Resource added successfully! Reloading...
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-highlight text-primary px-4 py-2 rounded hover:bg-highlight/90 transition disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Resource"}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="bg-contrast text-primary px-4 py-2 rounded hover:bg-default transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
