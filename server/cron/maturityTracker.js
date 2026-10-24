const cron = require('node-cron');
const FDRRecord = require('../models/FDRRecord');
const NotificationAlert = require('../models/NotificationAlert');
const { createAuditLog } = require('../utils/helpers');

async function runMaturityCheck() {
  console.log('[CRON] Running maturity check at', new Date().toISOString());
  const now = new Date();
  const results = {
    expiring7: 0, expiring30: 0, expiring60: 0, expiring90: 0, overdue: 0, total: 0
  };

  try {
    const activeFdrs = await FDRRecord.find({
      status: { $in: ['ACTIVE_VERIFIED', 'SUBMITTED', 'UNDER_SCRUTINY', 'EXPIRING_SOON'] }
    });

    for (const fdr of activeFdrs) {
      const maturityDate = new Date(fdr.maturityDate);
      const daysToMaturity = Math.ceil((maturityDate - now) / (1000 * 60 * 60 * 24));
      results.total++;

      if (daysToMaturity < 0) {
        // Overdue
        fdr.status = 'MATURED_OVERDUE';
        await fdr.save();
        results.overdue++;

        await NotificationAlert.create({
          recipientRole: 'INSTITUTION',
          institutionId: fdr.institutionId,
          fdrNumber: fdr.fdrNumber,
          alertType: 'OVERDUE',
          message: `URGENT: FDR ${fdr.fdrNumber} has MATURED and is overdue by ${Math.abs(daysToMaturity)} days. Immediate renewal required.`
        });

        await NotificationAlert.create({
          recipientRole: 'SCRUTINY_OFFICER',
          fdrNumber: fdr.fdrNumber,
          alertType: 'OVERDUE',
          message: `FDR ${fdr.fdrNumber} of ${fdr.institutionName} is overdue by ${Math.abs(daysToMaturity)} days. Action required.`
        });

        await NotificationAlert.create({
          recipientRole: 'DIRECTOR',
          fdrNumber: fdr.fdrNumber,
          alertType: 'OVERDUE',
          message: `ESCALATION: FDR ${fdr.fdrNumber} of ${fdr.institutionName} (₹${fdr.depositAmount.toLocaleString('en-IN')}) matured ${Math.abs(daysToMaturity)} days ago.`
        });
      } else if (daysToMaturity <= 7) {
        fdr.status = 'EXPIRING_SOON';
        await fdr.save();
        results.expiring7++;
        await NotificationAlert.create({
          recipientRole: 'INSTITUTION',
          institutionId: fdr.institutionId,
          fdrNumber: fdr.fdrNumber,
          alertType: 'EXPIRING_7_DAYS',
          message: `CRITICAL: FDR ${fdr.fdrNumber} expires in ${daysToMaturity} days (${maturityDate.toLocaleDateString('en-IN')}). Submit renewal immediately.`
        });
      } else if (daysToMaturity <= 30) {
        fdr.status = 'EXPIRING_SOON';
        await fdr.save();
        results.expiring30++;
        await NotificationAlert.create({
          recipientRole: 'INSTITUTION',
          institutionId: fdr.institutionId,
          fdrNumber: fdr.fdrNumber,
          alertType: 'EXPIRING_30_DAYS',
          message: `WARNING: FDR ${fdr.fdrNumber} expires in ${daysToMaturity} days (${maturityDate.toLocaleDateString('en-IN')}). Plan for renewal.`
        });
      } else if (daysToMaturity <= 60) {
        results.expiring60++;
        await NotificationAlert.create({
          recipientRole: 'INSTITUTION',
          institutionId: fdr.institutionId,
          fdrNumber: fdr.fdrNumber,
          alertType: 'EXPIRING_60_DAYS',
          message: `NOTICE: FDR ${fdr.fdrNumber} will expire in ${daysToMaturity} days (${maturityDate.toLocaleDateString('en-IN')}).`
        });
      } else if (daysToMaturity <= 90) {
        results.expiring90++;
        await NotificationAlert.create({
          recipientRole: 'INSTITUTION',
          institutionId: fdr.institutionId,
          fdrNumber: fdr.fdrNumber,
          alertType: 'EXPIRING_90_DAYS',
          message: `INFO: FDR ${fdr.fdrNumber} will mature in ${daysToMaturity} days (${maturityDate.toLocaleDateString('en-IN')}).`
        });
      }
    }

    await createAuditLog({
      action: 'MATURITY_CHECK_RUN',
      module: 'MATURITY_TRACKER',
      performedBy: 'SYSTEM_CRON',
      userRole: 'SYSTEM',
      newState: results
    });

    console.log('[CRON] Maturity check complete:', results);
    return results;
  } catch (err) {
    console.error('[CRON] Maturity check error:', err);
    return { error: err.message };
  }
}

function startMaturityCron() {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    runMaturityCheck();
  });
  console.log('[CRON] Maturity tracker cron scheduled (daily at 2:00 AM)');
}

module.exports = { startMaturityCron, runMaturityCheck };
