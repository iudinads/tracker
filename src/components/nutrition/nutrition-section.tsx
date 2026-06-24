"use client";

import { useMemo, useState } from "react";
import { apiDelete, apiPost, apiPut, useData } from "@/lib/data-context";
import { MEAL_TYPES, MealEntry, MealType, SavedDish, WeightEntry } from "@/lib/types";
import { sumMeals } from "@/lib/nutrition-utils";
import {
  FOOD_PRODUCTS,
  calcMacrosFromGrams,
  findProducts,
} from "@/data/food-products";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { ProgressRing } from "@/components/nutrition/progress-ring";
import { WeightChart } from "@/components/nutrition/weight-chart";
import { formatDate } from "@/components/ui/badge";

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const emptyMealForm = () => ({
  name: "",
  calories: "",
  protein: "",
  fat: "",
  carbs: "",
  mealType: "breakfast" as MealType,
  saveToHistory: false,
});

type MealEntryMode = "grams" | "custom";

export function NutritionSection() {
  const { data, loading, refresh } = useData();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [goalsForm, setGoalsForm] = useState({
    calories: "",
    protein: "",
    fat: "",
    carbs: "",
  });
  const [mealForm, setMealForm] = useState(emptyMealForm());
  const [mealEntryMode, setMealEntryMode] = useState<MealEntryMode>("grams");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [grams, setGrams] = useState("");
  const [weightForm, setWeightForm] = useState({
    date: new Date().toISOString().split("T")[0],
    weight: "",
  });

  const goals = data.nutritionGoals;
  const dayMeals = data.mealEntries.filter((m) => m.date === selectedDate);
  const totals = sumMeals(dayMeals);
  const weightEntries = [...data.weightEntries].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const productSuggestions = useMemo(
    () => findProducts(productSearch || selectedProduct),
    [productSearch, selectedProduct]
  );

  const applyGramsCalculation = (product: string, gramsValue: string) => {
    const per100 = FOOD_PRODUCTS[product];
    const gramsNum = Number(gramsValue);
    if (!per100 || !gramsNum || gramsNum <= 0) return;

    const macros = calcMacrosFromGrams(per100, gramsNum);
    setMealForm((prev) => ({
      ...prev,
      name: `${product}, ${gramsNum} г`,
      calories: String(macros.calories),
      protein: String(macros.protein),
      fat: String(macros.fat),
      carbs: String(macros.carbs),
    }));
  };

  const resetGramsForm = () => {
    setSelectedProduct("");
    setProductSearch("");
    setGrams("");
  };

  const openNewMeal = (mealType?: MealType) => {
    setEditingMeal(null);
    setMealEntryMode("grams");
    resetGramsForm();
    setMealForm({ ...emptyMealForm(), mealType: mealType || "breakfast" });
    setShowMealModal(true);
  };

  const openEditMeal = (meal: MealEntry) => {
    setEditingMeal(meal);
    setMealEntryMode("custom");
    resetGramsForm();
    setMealForm({
      name: meal.name,
      calories: String(meal.calories),
      protein: String(meal.protein),
      fat: String(meal.fat),
      carbs: String(meal.carbs),
      mealType: meal.mealType,
      saveToHistory: false,
    });
    setShowMealModal(true);
  };

  const applyDish = (dish: SavedDish) => {
    setEditingMeal(null);
    setMealEntryMode("custom");
    resetGramsForm();
    setMealForm({
      name: dish.name,
      calories: String(dish.calories),
      protein: String(dish.protein),
      fat: String(dish.fat),
      carbs: String(dish.carbs),
      mealType: mealForm.mealType,
      saveToHistory: false,
    });
    setShowHistory(false);
    setShowMealModal(true);
  };

  const openSettings = () => {
    setGoalsForm({
      calories: String(goals.calories),
      protein: String(goals.protein),
      fat: String(goals.fat),
      carbs: String(goals.carbs),
    });
    setShowSettings(true);
  };

  const selectProduct = (product: string) => {
    setSelectedProduct(product);
    setProductSearch(product);
    applyGramsCalculation(product, grams);
  };

  const handleGramsChange = (value: string) => {
    setGrams(value);
    if (selectedProduct) {
      applyGramsCalculation(selectedProduct, value);
    }
  };

  const handleSaveMeal = async () => {
    if (!mealForm.name.trim()) return;
    if (mealEntryMode === "grams" && (!selectedProduct || !grams || Number(grams) <= 0)) return;

    const payload = {
      name: mealForm.name,
      calories: mealForm.calories,
      protein: mealForm.protein,
      fat: mealForm.fat,
      carbs: mealForm.carbs,
      mealType: mealForm.mealType,
    };

    if (editingMeal) {
      await apiPut("/api/nutrition/meals", { id: editingMeal.id, ...payload });
    } else {
      await apiPost("/api/nutrition/meals", { date: selectedDate, ...payload });
    }

    if (mealForm.saveToHistory) {
      await apiPost("/api/nutrition/dishes", payload);
    }

    setShowMealModal(false);
    await refresh();
  };

  const handleSaveGoals = async () => {
    await apiPut("/api/nutrition/settings", {
      calories: goalsForm.calories,
      protein: goalsForm.protein,
      fat: goalsForm.fat,
      carbs: goalsForm.carbs,
    });
    setShowSettings(false);
    await refresh();
  };

  const handleDeleteMeal = async (id: string) => {
    if (!confirm("Удалить запись?")) return;
    await apiDelete(`/api/nutrition/meals?id=${id}`);
    await refresh();
  };

  const handleDeleteMealFromModal = async () => {
    if (!editingMeal) return;
    if (!confirm("Удалить запись?")) return;
    await apiDelete(`/api/nutrition/meals?id=${editingMeal.id}`);
    setShowMealModal(false);
    await refresh();
  };

  const handleDeleteDish = async (id: string) => {
    if (!confirm("Удалить из истории?")) return;
    await apiDelete(`/api/nutrition/dishes?id=${id}`);
    await refresh();
  };

  const openWeightModal = () => {
    setWeightForm({
      date: new Date().toISOString().split("T")[0],
      weight: "",
    });
    setShowWeightModal(true);
  };

  const handleSaveWeight = async () => {
    if (!weightForm.date || !weightForm.weight) return;
    await apiPost<WeightEntry>("/api/nutrition/weight", {
      date: weightForm.date,
      weight: weightForm.weight,
    });
    setShowWeightModal(false);
    await refresh();
  };

  const handleDeleteWeight = async (id: string) => {
    if (!confirm("Удалить измерение?")) return;
    await apiDelete(`/api/nutrition/weight?id=${id}`);
    await refresh();
  };

  if (loading) {
    return <div className="py-20 text-center text-neutral-400">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Питание</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowHistory(true)}>
            История
          </Button>
          <Button size="sm" variant="secondary" onClick={openSettings}>
            Нормы
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white px-4 py-3">
        <button
          onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
          className="rounded-lg px-3 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
        >
          ←
        </button>
        <span className="text-sm font-medium">{formatDate(selectedDate)}</span>
        <button
          onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
          className="rounded-lg px-3 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
        >
          →
        </button>
      </div>

      <div className="flex justify-around rounded-xl border border-neutral-100 bg-white py-5">
        <ProgressRing label="Ккал" actual={totals.calories} goal={goals.calories} />
        <ProgressRing label="Б" actual={totals.protein} goal={goals.protein} unit="г" />
        <ProgressRing label="Ж" actual={totals.fat} goal={goals.fat} unit="г" />
        <ProgressRing label="У" actual={totals.carbs} goal={goals.carbs} unit="г" />
      </div>

      {MEAL_TYPES.map((mealType) => {
        const meals = dayMeals.filter((m) => m.mealType === mealType.value);

        return (
          <div key={mealType.value} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-700">{mealType.label}</h3>
              <Button size="sm" variant="ghost" onClick={() => openNewMeal(mealType.value)}>
                + Добавить
              </Button>
            </div>

            {meals.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-200 py-4 text-center text-xs text-neutral-400">
                Нет записей
              </div>
            ) : (
              <div className="space-y-1.5">
                {meals.map((meal) => (
                  <div
                    key={meal.id}
                    className="group flex items-center justify-between rounded-lg border border-neutral-100 bg-white px-3 py-2.5"
                  >
                    <button className="flex-1 text-left" onClick={() => openEditMeal(meal)}>
                      <p className="text-sm font-medium">{meal.name}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {meal.calories} ккал · Б {meal.protein} · Ж {meal.fat} · У {meal.carbs}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="ml-2 rounded px-2 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-500 transition shrink-0"
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-700">Вес</h3>
          <Button size="sm" onClick={openWeightModal}>
            + Измерение
          </Button>
        </div>

        {weightEntries.length > 0 && (
          <div className="space-y-1.5">
            {weightEntries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{entry.weight} кг</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{formatDate(entry.date)}</p>
                </div>
                <button
                  onClick={() => handleDeleteWeight(entry.id)}
                  className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-500"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-neutral-100 bg-white p-4">
          <WeightChart entries={data.weightEntries} />
          <p className="mt-2 text-center text-[10px] text-neutral-400">
            Целевой диапазон: 51–53 кг
          </p>
        </div>
      </div>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Нормы на день">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ккал"
              type="number"
              min={0}
              value={goalsForm.calories}
              onChange={(e) => setGoalsForm({ ...goalsForm, calories: e.target.value })}
            />
            <Input
              label="Белки (г)"
              type="number"
              min={0}
              value={goalsForm.protein}
              onChange={(e) => setGoalsForm({ ...goalsForm, protein: e.target.value })}
            />
            <Input
              label="Жиры (г)"
              type="number"
              min={0}
              value={goalsForm.fat}
              onChange={(e) => setGoalsForm({ ...goalsForm, fat: e.target.value })}
            />
            <Input
              label="Углеводы (г)"
              type="number"
              min={0}
              value={goalsForm.carbs}
              onChange={(e) => setGoalsForm({ ...goalsForm, carbs: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowSettings(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveGoals}>Сохранить</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showMealModal}
        onClose={() => setShowMealModal(false)}
        title={editingMeal ? "Редактировать" : "Добавить блюдо"}
      >
        <div className="space-y-4">
          {!editingMeal && (
            <div className="flex rounded-lg bg-neutral-100 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setMealEntryMode("grams");
                  resetGramsForm();
                  setMealForm((prev) => ({
                    ...emptyMealForm(),
                    mealType: prev.mealType,
                  }));
                }}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mealEntryMode === "grams"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                По граммам
              </button>
              <button
                type="button"
                onClick={() => {
                  setMealEntryMode("custom");
                  resetGramsForm();
                  setMealForm((prev) => ({
                    ...emptyMealForm(),
                    mealType: prev.mealType,
                  }));
                }}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mealEntryMode === "custom"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                Вручную
              </button>
            </div>
          )}

          {!editingMeal && mealEntryMode === "custom" && data.savedDishes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-neutral-500">Из истории</p>
              <div className="flex flex-wrap gap-1.5">
                {data.savedDishes.map((dish) => (
                  <button
                    key={dish.id}
                    onClick={() =>
                      setMealForm({
                        ...mealForm,
                        name: dish.name,
                        calories: String(dish.calories),
                        protein: String(dish.protein),
                        fat: String(dish.fat),
                        carbs: String(dish.carbs),
                      })
                    }
                    className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600 hover:border-neutral-400"
                  >
                    {dish.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!editingMeal && mealEntryMode === "grams" ? (
            <>
              <div>
                <Input
                  label="Продукт"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Начните вводить название"
                  autoFocus
                />
                {productSuggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {productSuggestions.map((product) => (
                      <button
                        key={product}
                        type="button"
                        onClick={() => selectProduct(product)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          selectedProduct === product
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                        }`}
                      >
                        {product}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                label="Граммы"
                type="number"
                min={1}
                step="1"
                value={grams}
                onChange={(e) => handleGramsChange(e.target.value)}
                placeholder="60"
              />
              {selectedProduct && grams && Number(grams) > 0 && (
                <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-600">
                  <p className="font-medium text-neutral-700">{mealForm.name || selectedProduct}</p>
                  <p className="mt-1">
                    {mealForm.calories || 0} ккал · Б {mealForm.protein || 0} · Ж {mealForm.fat || 0} · У{" "}
                    {mealForm.carbs || 0}
                  </p>
                  <p className="mt-1 text-neutral-400">
                    на 100 г: {FOOD_PRODUCTS[selectedProduct][0]} ккал · Б{" "}
                    {FOOD_PRODUCTS[selectedProduct][1]} · Ж {FOOD_PRODUCTS[selectedProduct][2]} · У{" "}
                    {FOOD_PRODUCTS[selectedProduct][3]}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <Input
                label="Название"
                value={mealForm.name}
                onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                autoFocus={editingMeal !== null || mealEntryMode === "custom"}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Ккал"
                  type="number"
                  min={0}
                  value={mealForm.calories}
                  onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                />
                <Input
                  label="Белки (г)"
                  type="number"
                  min={0}
                  value={mealForm.protein}
                  onChange={(e) => setMealForm({ ...mealForm, protein: e.target.value })}
                />
                <Input
                  label="Жиры (г)"
                  type="number"
                  min={0}
                  value={mealForm.fat}
                  onChange={(e) => setMealForm({ ...mealForm, fat: e.target.value })}
                />
                <Input
                  label="Углеводы (г)"
                  type="number"
                  min={0}
                  value={mealForm.carbs}
                  onChange={(e) => setMealForm({ ...mealForm, carbs: e.target.value })}
                />
              </div>
            </>
          )}

          <Select
            label="Приём пищи"
            value={mealForm.mealType}
            onChange={(e) =>
              setMealForm({ ...mealForm, mealType: e.target.value as MealType })
            }
            options={MEAL_TYPES}
          />

          {!editingMeal && mealEntryMode === "custom" && (
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={mealForm.saveToHistory}
                onChange={(e) =>
                  setMealForm({ ...mealForm, saveToHistory: e.target.checked })
                }
                className="rounded border-neutral-300"
              />
              Сохранить в историю блюд
            </label>
          )}

          <div className="flex justify-end gap-2">
            {editingMeal && (
              <Button variant="danger" onClick={handleDeleteMealFromModal}>
                Удалить
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowMealModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveMeal}>Сохранить</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="История блюд">
        {data.savedDishes.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">
            Пока пусто. Отметьте «Сохранить в историю» при добавлении блюда.
          </p>
        ) : (
          <div className="space-y-2">
            {data.savedDishes.map((dish) => (
              <div
                key={dish.id}
                className="flex items-center justify-between rounded-lg border border-neutral-100 p-3"
              >
                <button className="flex-1 text-left" onClick={() => applyDish(dish)}>
                  <p className="text-sm font-medium">{dish.name}</p>
                  <p className="text-xs text-neutral-500">
                    {dish.calories} ккал · Б {dish.protein} · Ж {dish.fat} · У {dish.carbs}
                  </p>
                </button>
                <button
                  onClick={() => handleDeleteDish(dish.id)}
                  className="ml-2 text-neutral-300 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={showWeightModal} onClose={() => setShowWeightModal(false)} title="Новое измерение">
        <div className="space-y-4">
          <Input
            label="Дата измерения"
            type="date"
            value={weightForm.date}
            onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })}
          />
          <Input
            label="Вес (кг)"
            type="number"
            min={0}
            step="0.1"
            value={weightForm.weight}
            onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowWeightModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveWeight}>Добавить</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
