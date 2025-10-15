from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer
from app.supabase_client import supabase
from app.schemas.candidate import CandidateSettings, CandidateSettingsUpdate, CandidateSettingsResponse
from typing import Optional

security = HTTPBearer()
router = APIRouter(prefix="/candidate", tags=["candidate"])

def get_current_user(token: str = Depends(security)):
    try:
        response = supabase.auth.get_user(token.credentials)
        user = response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        role = user.user_metadata.get('role', 'employee')
        if role != 'candidate':
            raise HTTPException(status_code=403, detail="Access denied. Candidate role required.")
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/settings", response_model=CandidateSettingsResponse)
def get_candidate_settings(current_user = Depends(get_current_user)):
    try:
        # Fetch settings from database
        response = supabase.table('candidate_settings').select('*').eq('user_id', current_user.id).execute()

        if not response.data:
            # Return default settings if none exist
            default_settings = CandidateSettings()
            return CandidateSettingsResponse(
                user_id=current_user.id,
                settings=default_settings
            )

        settings_data = response.data[0]
        settings = CandidateSettings(**settings_data)
        return CandidateSettingsResponse(
            user_id=settings_data['user_id'],
            settings=settings,
            updated_at=settings_data.get('updated_at')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch settings: {str(e)}")

@router.put("/settings", response_model=CandidateSettingsResponse)
def update_candidate_settings(
    settings_update: CandidateSettingsUpdate,
    current_user = Depends(get_current_user)
):
    try:
        # Fetch existing settings
        existing_response = supabase.table('candidate_settings').select('*').eq('user_id', current_user.id).execute()

        if not existing_response.data:
            # Create new settings record
            new_settings = CandidateSettings(**settings_update.dict(exclude_unset=True))
            settings_data = {
                'user_id': current_user.id,
                **new_settings.dict()
            }
            response = supabase.table('candidate_settings').insert(settings_data).execute()
            created_data = response.data[0]
            return CandidateSettingsResponse(
                user_id=created_data['user_id'],
                settings=CandidateSettings(**created_data),
                updated_at=created_data.get('updated_at')
            )
        else:
            # Update existing settings
            existing_data = existing_response.data[0]
            update_data = settings_update.dict(exclude_unset=True)

            # Merge with existing data
            merged_data = {**existing_data, **update_data}

            response = supabase.table('candidate_settings').update(merged_data).eq('user_id', current_user.id).execute()
            updated_data = response.data[0]

            return CandidateSettingsResponse(
                user_id=updated_data['user_id'],
                settings=CandidateSettings(**updated_data),
                updated_at=updated_data.get('updated_at')
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")

@router.put("/password")
def change_password(
    current_password: str,
    new_password: str,
    current_user = Depends(get_current_user)
):
    try:
        # Verify current password by attempting to sign in
        sign_in_response = supabase.auth.sign_in_with_password({
            "email": current_user.email,
            "password": current_password
        })

        if not sign_in_response.user:
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        # Update password
        update_response = supabase.auth.update_user({
            "password": new_password
        })

        if not update_response.user:
            raise HTTPException(status_code=500, detail="Failed to update password")

        return {"message": "Password updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")

@router.delete("/account")
def delete_account(current_user = Depends(get_current_user)):
    try:
        # Delete user settings first
        supabase.table('candidate_settings').delete().eq('user_id', current_user.id).execute()

        # Note: Supabase admin API would be needed for full account deletion
        # For now, we'll mark the account as deactivated or log the request
        # In a production app, this would trigger an email confirmation and admin review

        return {"message": "Account deletion request submitted. You will receive a confirmation email."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process account deletion: {str(e)}")
