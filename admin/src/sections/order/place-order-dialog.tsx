'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Step from '@mui/material/Step';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Stepper from '@mui/material/Stepper';
import Divider from '@mui/material/Divider';
import StepLabel from '@mui/material/StepLabel';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';

import { useEmployeeStatus, useEmployeeMenu, usePlaceOrder } from './hooks/use-orders';

// ----------------------------------------------------------------------

const fSom = (v: string | number) => fCurrency(Number(v));

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function PlaceOrderDialog({ open, onClose, onSuccess }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: empStatus, isLoading: statusLoading } = useEmployeeStatus(open);
  const { data: menu,      isLoading: menuLoading    } = useEmployeeMenu(today);
  const placeMutation = usePlaceOrder();

  const branches  = empStatus?.branches ?? [];
  const menuItems = menu?.items ?? [];

  const needsBranchStep = branches.length > 1;
  const steps = needsBranchStep ? ['Filial tanlash', 'Taom tanlash'] : ['Taom tanlash'];

  const [step,     setStep]     = useState(0);
  const [branchId, setBranchId] = useState('');
  const [mealId,   setMealId]   = useState('');

  const reset = () => {
    setStep(0);
    setBranchId('');
    setMealId('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const selectedMeal = menuItems.find((m) => m.id === mealId);

  const resolvedBranchId = needsBranchStep ? branchId : branches[0]?.id ?? '';

  const handleConfirm = async () => {
    if (!resolvedBranchId || !mealId || !selectedMeal) return;
    try {
      await placeMutation.mutateAsync({
        branch_id:   resolvedBranchId,
        kitchen_id:  selectedMeal.kitchen_id,
        meal_id:     mealId,
        target_date: today,
      });
      toast.success('Buyurtma muvaffaqiyatli qabul qilindi!');
      reset();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      toast.error(msg);
    }
  };

  const isLoading = statusLoading || menuLoading;

  const currentStepLabel = needsBranchStep
    ? step === 0 ? 'Filial tanlash' : 'Taom tanlash'
    : 'Taom tanlash';

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Buyurtma berish
          <Label variant="soft" color="primary">{fDate(today)}</Label>
        </Box>
      </DialogTitle>

      {needsBranchStep && (
        <Box sx={{ px: 3, pb: 1 }}>
          <Stepper activeStep={step} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      )}

      <Divider />

      <DialogContent sx={{ py: 3, minHeight: 260 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Step 0: Branch selection (only when multiple branches) */}
            {needsBranchStep && step === 0 && (
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Bugun qaysi filialga yetkazilsin?
                </Typography>
                <RadioGroup value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  {branches.map((b) => (
                    <FormControlLabel
                      key={b.id}
                      value={b.id}
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{b.address}</Typography>
                        </Box>
                      }
                      sx={{
                        border: '1px solid',
                        borderColor: branchId === b.id ? 'primary.main' : 'divider',
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 1,
                        mb: 1,
                        mx: 0,
                        bgcolor: branchId === b.id ? 'primary.lighter' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                    />
                  ))}
                </RadioGroup>
              </Stack>
            )}

            {/* Meal selection step */}
            {(!needsBranchStep || step === 1) && (
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Bugungi menyu — taom tanlang
                </Typography>

                {menuItems.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">Bugun uchun menyu mavjud emas</Typography>
                  </Box>
                ) : (
                  <RadioGroup value={mealId} onChange={(e) => setMealId(e.target.value)}>
                    {menuItems.map((item) => (
                      <FormControlLabel
                        key={item.id}
                        value={item.id}
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                              {item.description && (
                                <Typography variant="caption" color="text.secondary">{item.description}</Typography>
                              )}
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', ml: 2, flexShrink: 0 }}>
                              {fSom(item.price)}
                            </Typography>
                          </Box>
                        }
                        sx={{
                          border: '1px solid',
                          borderColor: mealId === item.id ? 'primary.main' : 'divider',
                          borderRadius: 1.5,
                          px: 1.5,
                          py: 1,
                          mb: 1,
                          mx: 0,
                          bgcolor: mealId === item.id ? 'primary.lighter' : 'transparent',
                          transition: 'all 0.15s',
                          '& .MuiFormControlLabel-label': { width: '100%' },
                        }}
                      />
                    ))}
                  </RadioGroup>
                )}
              </Stack>
            )}
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions>
        <Button onClick={handleClose} color="inherit">Bekor qilish</Button>

        {needsBranchStep && step === 1 && (
          <Button onClick={handleBack} color="inherit">Orqaga</Button>
        )}

        {needsBranchStep && step === 0 ? (
          <Button
            variant="contained"
            disabled={!branchId}
            onClick={handleNext}
          >
            Davom etish
          </Button>
        ) : (
          <LoadingButton
            variant="contained"
            disabled={!mealId || menuItems.length === 0}
            loading={placeMutation.isPending}
            onClick={handleConfirm}
          >
            Buyurtma berish
          </LoadingButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
