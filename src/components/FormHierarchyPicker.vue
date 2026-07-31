<template>
  <div class="form-hierarchy" role="group" :aria-label="ariaLabel">
    <div class="form-hierarchy__intro">
      <strong>表单分类</strong>
      <span>按业务阶段选择，当前共 {{ items.length }} 张表单</span>
    </div>

    <div class="form-hierarchy__sections">
      <section
        v-for="section in sections"
        :key="section.key"
        class="form-hierarchy__section"
        :class="`form-hierarchy__section--${section.key}`"
      >
        <header class="form-hierarchy__section-head">
          <span v-if="section.index" class="form-hierarchy__index">{{ section.index }}</span>
          <span class="form-hierarchy__section-title">{{ section.label }}</span>
          <span class="form-hierarchy__count">{{ section.count }}</span>
        </header>

        <div v-if="section.subgroups.length" class="form-hierarchy__subgroups">
          <div v-for="subgroup in section.subgroups" :key="subgroup.key" class="form-hierarchy__subgroup">
            <div class="form-hierarchy__subgroup-head">
              <span>{{ subgroup.label }}</span>
              <span>{{ subgroup.items.length }}</span>
            </div>
            <div v-if="subgroup.items.length" class="form-hierarchy__items">
              <button
                v-for="item in subgroup.items"
                :key="item.key"
                type="button"
                class="form-hierarchy__item"
                :class="{ 'form-hierarchy__item--active': item.key === modelValue }"
                :aria-pressed="item.key === modelValue"
                @click="selectItem(item.key)"
              >
                <span>{{ item.label }}</span>
                <code>{{ item.formType }}</code>
              </button>
            </div>
            <div v-else class="form-hierarchy__empty">暂无已归集表单</div>
          </div>
        </div>

        <div v-else-if="section.items.length" class="form-hierarchy__items">
          <button
            v-for="item in section.items"
            :key="item.key"
            type="button"
            class="form-hierarchy__item"
            :class="{ 'form-hierarchy__item--active': item.key === modelValue }"
            :aria-pressed="item.key === modelValue"
            @click="selectItem(item.key)"
          >
            <span>{{ item.label }}</span>
            <code>{{ item.formType }}</code>
          </button>
        </div>
        <div v-else class="form-hierarchy__empty">暂无已归集表单</div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buildFormHierarchy, type FormHierarchyItem } from '@/utils/form-taxonomy'

const props = withDefaults(defineProps<{
  modelValue: string | null
  items: FormHierarchyItem[]
  ariaLabel?: string
}>(), {
  ariaLabel: '工作表单分类选择',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const sections = computed(() => buildFormHierarchy(props.items))

function selectItem(key: string) {
  emit('update:modelValue', key)
}
</script>

<style scoped>
.form-hierarchy {
  margin: 14px 0 18px;
  padding: 14px;
  border: 1px solid var(--yy-border);
  border-radius: 8px;
  background: var(--yy-surface-soft);
}

.form-hierarchy__intro {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}

.form-hierarchy__intro strong {
  color: var(--yy-text);
  font-size: 14px;
}

.form-hierarchy__intro span {
  color: var(--yy-text-muted);
  font-size: 12px;
}

.form-hierarchy__sections {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.form-hierarchy__section {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--yy-border);
  border-radius: 8px;
  background: var(--yy-surface);
}

.form-hierarchy__section--soil,
.form-hierarchy__section--other {
  grid-column: 1 / -1;
}

.form-hierarchy__section-head,
.form-hierarchy__subgroup-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-hierarchy__section-head {
  margin-bottom: 10px;
}

.form-hierarchy__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--yy-primary);
  color: var(--yy-surface);
  font-size: 12px;
  font-weight: 700;
}

.form-hierarchy__section-title {
  color: var(--yy-text);
  font-size: 14px;
  font-weight: 700;
}

.form-hierarchy__count {
  min-width: 22px;
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--yy-bg-muted);
  color: var(--yy-text-secondary);
  font-size: 12px;
  text-align: center;
}

.form-hierarchy__subgroups {
  display: grid;
  grid-template-columns: minmax(190px, 0.35fr) minmax(0, 1.65fr);
  gap: 10px;
}

.form-hierarchy__subgroup {
  min-width: 0;
  padding: 10px;
  border-radius: 6px;
  background: var(--yy-surface-soft);
}

.form-hierarchy__subgroup-head {
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--yy-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.form-hierarchy__items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 8px;
}

.form-hierarchy__item {
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--yy-border);
  border-radius: 6px;
  background: var(--yy-surface);
  color: var(--yy-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.form-hierarchy__item:hover {
  border-color: var(--yy-primary);
  background: var(--yy-fill-hover);
}

.form-hierarchy__item:focus-visible {
  outline: 2px solid var(--yy-primary);
  outline-offset: 2px;
}

.form-hierarchy__item--active {
  border-color: var(--yy-primary);
  background: var(--yy-fill-active);
  box-shadow: inset 3px 0 0 var(--yy-primary);
}

.form-hierarchy__item span {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-hierarchy__item code {
  overflow: hidden;
  color: var(--yy-text-muted);
  font-family: var(--font-mono);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-hierarchy__empty {
  padding: 9px 10px;
  border: 1px dashed var(--yy-border);
  border-radius: 6px;
  color: var(--yy-text-muted);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 900px) {
  .form-hierarchy__sections,
  .form-hierarchy__subgroups {
    grid-template-columns: 1fr;
  }

  .form-hierarchy__section--soil,
  .form-hierarchy__section--other {
    grid-column: auto;
  }
}

@media (max-width: 560px) {
  .form-hierarchy {
    padding: 10px;
  }

  .form-hierarchy__intro {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }

  .form-hierarchy__items {
    grid-template-columns: 1fr;
  }
}
</style>
