"use client";

import { useState } from "react";
import { apiDelete, apiPost, apiPut, useData } from "@/lib/data-context";
import { MEAL_TYPES, MealEntry, MealType, SavedDish } from "@/lib/types";
import { sumMeals } from "@/lib/nutrition-utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { ProgressRing } from "@/components/nutrition/progress-ring";
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

export function NutritionSection() {
  const { data, loading, refresh } = useData();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [goalsForm, setGoalsForm] = useState({
    calories: "",
    protein: "",
    fat: "",
    carbs: "",
  });
  const [mealForm, setMealForm] = useState(emptyMealForm());

  const goals = data.nutritionGoals;
  const dayMeals = data.mealEntries.filter((m) => m.date === selectedDate);
  const totals = sumMeals(dayMeals);

  const openSettings = () => {
    setGoalsForm({
      calories: String(goals.calories),
      protein: String(goals.protein),
      fat: String(goals.fat),
      carbs: String(goals.carbs),
    });
    setShowSettings(true);
  };

  const openNewMeal = (mealType?: MealType) => {
    setEditingMeal(null);
    setMealForm({ ...emptyMealForm(), mealType: mealType || "breakfast" });
    setShowMealModal(true);
  };

  const openEditMeal = (meal: MealEntry) => {
    setEditingMeal(meal);
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

  const handleSaveMeal = async () => {
    if (!mealForm.name.trim()) return;

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

  const handleDeleteMeal = async (id: string) => {
    if (!confirm("Удалить запись?")) return;
    await apiDelete(`/api/nutrition/meals?id=${id}`);
    await refresh();
  };

  const handleDeleteDish = async (id: string) => {
    if (!confirm("Удалить из истории?")) return;
    await apiDelete(`/api/nutrition/dishes?id=${id}`);
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
                      className="ml-2 rounded p-1 text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

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
          {!editingMeal && data.savedDishes.length > 0 && (
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

          <Input
            label="Название"
            value={mealForm.name}
            onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
            autoFocus
          />
          <Select
            label="Приём пищи"
            value={mealForm.mealType}
            onChange={(e) =>
              setMealForm({ ...mealForm, mealType: e.target.value as MealType })
            }
            options={MEAL_TYPES}
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

          {!editingMeal && (
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
    </div>
  );
}
