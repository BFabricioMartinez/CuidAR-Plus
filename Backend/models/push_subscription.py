from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from config.db import Base

#region MODELO SQLALCHEMY

class PushSubscription(Base):
    """
    Modelo para almacenar suscripciones push de los usuarios.
    Cada usuario puede tener múltiples dispositivos suscritos.
    """
    __tablename__ = 'push_subscriptions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    endpoint = Column(String(500), nullable=False)
    p256dh_key = Column(String(200), nullable=False)
    auth_key = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relación con User
    user = relationship('User', backref='push_subscriptions')

    # Constraint: Un usuario puede tener el mismo endpoint solo una vez
    __table_args__ = (
        UniqueConstraint('user_id', 'endpoint', name='uq_user_endpoint'),
    )

#endregion

#region MODELOS PYDANTIC

class PushSubscriptionKeys(BaseModel):
    """Claves de encriptación de la suscripción push"""
    p256dh: str
    auth: str

class PushSubscriptionData(BaseModel):
    """Datos completos de una suscripción push del navegador"""
    endpoint: str
    keys: PushSubscriptionKeys

class PushSubscriptionCreate(BaseModel):
    """Modelo para crear una nueva suscripción push"""
    subscription: PushSubscriptionData

class PushSubscriptionResponse(BaseModel):
    """Modelo de respuesta para suscripciones push"""
    id: int
    user_id: int
    endpoint: str
    created_at: datetime

    class Config:
        from_attributes = True

class PushNotificationPayload(BaseModel):
    """Payload para enviar una notificación push"""
    title: str
    body: str
    icon: Optional[str] = '/pwa-192x192.png'
    badge: Optional[str] = '/pwa-192x192.png'
    tag: Optional[str] = 'notification'
    data: Optional[dict] = None

#endregion
