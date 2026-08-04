/** Группа станков, выведенная из уже загруженного списка станков — отдельного справочника групп в API нет. */
export interface MachineGroupOption {
  groupId: string
  groupName: string
  workshopId: string
  workshopName: string
}
