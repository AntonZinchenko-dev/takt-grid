export type { Machine, MachineStatus, DowntimeRule } from './model/types'
export {
  useMachinesQuery,
  useCreateMachineMutation,
  useUpdateMachineMutation,
  useDeleteMachineMutation,
  type CreateMachineParams,
  type UpdateMachineParams,
  type UpdateMachineResult,
  type DeleteMachineResult,
} from './api/queries'
export {
  useDowntimeRulesQuery,
  useCreateDowntimeRuleMutation,
  type CreateDowntimeRuleParams,
  type CreateDowntimeRuleResult,
} from './api/downtime-queries'
