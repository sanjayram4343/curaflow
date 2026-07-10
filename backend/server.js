import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorMiddleware.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import bedRoutes from './routes/bedRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import pricingRoutes from './routes/pricingRoutes.js';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/pricing', pricingRoutes);

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
