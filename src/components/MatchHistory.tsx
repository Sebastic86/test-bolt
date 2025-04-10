import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Player, MatchHistoryItem } from '../types';
import { Save, RefreshCw, ChevronDown, ChevronUp, X, Trash2, Shield } from 'lucide-react'; // Import Shield

interface MatchHistoryProps {
  matchesToday: MatchHistoryItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  allPlayers: Player[];
}

// State to track logo errors within the history list
interface LogoErrorState {
  [logoKey: string]: boolean; // e.g., { 'matchId-team1': true, 'matchId-team2': false }
}

// Helper function to format date/time
const formatDateTimeEuropean = (isoString: string): string => {
    try {
        const date = new Date(isoString);
        // Use 'en-GB' for DD/MM/YYYY format, adjust options for 24-hour time
        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false, // Use 24-hour format
        };
        return date.toLocaleString('en-GB', options);
    } catch (e) {
        console.error("Error formatting date:", e);
        return "Invalid Date";
    }
};


const MatchHistory: React.FC<MatchHistoryProps> = ({
  matchesToday,
  loading,
  error,
  onRefresh,
  allPlayers,
}) => {
  const [editingScoreMatchId, setEditingScoreMatchId] = useState<string | null>(null);
  const [score1Input, setScore1Input] = useState<string>('');
  const [score2Input, setScore2Input] = useState<string>('');
  const [savingScore, setSavingScore] = useState<boolean>(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [logoErrors, setLogoErrors] = useState<LogoErrorState>({}); // State for logo errors

  // Function to handle logo loading errors
  const handleLogoError = (matchId: string, teamNumber: 1 | 2) => {
    const key = `${matchId}-team${teamNumber}`;
    setLogoErrors(prevErrors => ({ ...prevErrors, [key]: true }));
  };

  // Reset logo errors when matchesToday changes (e.g., on refresh)
  React.useEffect(() => {
    setLogoErrors({});
  }, [matchesToday]);


  const highlightedMatchIds = useMemo(() => {
    let maxDiff = -1;
    const completedMatches = matchesToday.filter(
      match => match.team1_score !== null && match.team2_score !== null
    );

    if (completedMatches.length === 0) {
      return new Set<string>();
    }

    completedMatches.forEach(match => {
      const diff = Math.abs(match.team1_score! - match.team2_score!);
      if (diff > maxDiff) {
        maxDiff = diff;
      }
    });

    const matchesWithMaxDiff = completedMatches.filter(match => {
      const diff = Math.abs(match.team1_score! - match.team2_score!);
      return diff === maxDiff;
    });

    if (matchesWithMaxDiff.length <= 1) {
      return new Set<string>(matchesWithMaxDiff.map(m => m.id));
    } else {
      let maxTotalGoals = -1;
      matchesWithMaxDiff.forEach(match => {
        const totalGoals = match.team1_score! + match.team2_score!;
        if (totalGoals > maxTotalGoals) {
          maxTotalGoals = totalGoals;
        }
      });

      const finalMatchesToHighlight = matchesWithMaxDiff.filter(match => {
        const totalGoals = match.team1_score! + match.team2_score!;
        return totalGoals === maxTotalGoals;
      });

      return new Set<string>(finalMatchesToHighlight.map(m => m.id));
    }
  }, [matchesToday]);

  const handleEditScoreClick = (match: MatchHistoryItem) => {
    setEditingScoreMatchId(match.id);
    setScore1Input(match.team1_score?.toString() ?? '');
    setScore2Input(match.team2_score?.toString() ?? '');
  };

  const handleCancelEditScore = () => {
    setEditingScoreMatchId(null);
    setScore1Input('');
    setScore2Input('');
  };

  const handleSaveScore = async (matchId: string) => {
    const score1 = parseInt(score1Input, 10);
    const score2 = parseInt(score2Input, 10);

    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      alert('Please enter valid non-negative scores.');
      return;
    }

    setSavingScore(true);
    try {
      const { error: updateError } = await supabase
        .from('matches')
        .update({ team1_score: score1, team2_score: score2 })
        .eq('id', matchId);

      if (updateError) throw updateError;

      setEditingScoreMatchId(null);
      onRefresh();

    } catch (err: any) {
      console.error('Error updating score:', err);
      alert('Failed to save score.');
    } finally {
      setSavingScore(false);
    }
  };

  const handleDeleteMatch = async (matchId: string, team1Name: string, team2Name: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete the match: ${team1Name} vs ${team2Name}? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeletingMatchId(matchId);
    try {
      const { error: deleteError } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (deleteError) throw deleteError;

      console.log(`Match ${matchId} deleted successfully.`);
      onRefresh();

    } catch (err: any) {
      console.error('Error deleting match:', err);
      alert('Failed to delete match.');
    } finally {
      setDeletingMatchId(null);
    }
  };


  const toggleExpandMatch = (matchId: string) => {
    setExpandedMatchId(prevId => (prevId === matchId ? null : matchId));
  };

  return (
    <div className="w-full max-w-4xl mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-700">Today's Matches</h2>
        <button
            onClick={onRefresh}
            className="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50"
            disabled={loading || savingScore || !!deletingMatchId}
            aria-label="Refresh match history"
            title="Refresh History"
        >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && matchesToday.length === 0 && <p className="text-center text-gray-600">Loading history...</p>}
      {error && <p className="text-center text-red-600 bg-red-100 p-3 rounded">{error}</p>}
      {!loading && !error && matchesToday.length === 0 && (
        <p className="text-center text-gray-500">No matches recorded today.</p>
      )}

      {!loading && !error && matchesToday.length > 0 && (
        <ul className="space-y-4">
          {matchesToday.map((match) => {
            const shouldHighlight = highlightedMatchIds.has(match.id);
            const highlightClasses = shouldHighlight ? 'border-yellow-400 border-2 shadow-lg bg-yellow-50' : 'border-gray-200 bg-white';
            const isDeletingThisMatch = deletingMatchId === match.id;
            const logo1Error = logoErrors[`${match.id}-team1`];
            const logo2Error = logoErrors[`${match.id}-team2`];

            return (
              <li key={match.id} className={`rounded-lg shadow p-4 border transition-all duration-200 ${highlightClasses} ${isDeletingThisMatch ? 'opacity-50' : ''}`}>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-2">
                   {/* Teams and Score */}
                   <div className="flex items-center space-x-2 flex-grow mb-2 sm:mb-0 min-w-0">
                      {/* Team 1 Logo/Fallback */}
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 bg-gray-100 rounded overflow-hidden text-gray-400">
                        {logo1Error ? (
                          <Shield className="w-5 h-5" aria-label="Team 1 logo fallback" />
                        ) : (
                          <img
                            src={match.team1_logoUrl}
                            alt={match.team1_name}
                            className="w-full h-full object-contain"
                            onError={() => handleLogoError(match.id, 1)}
                          />
                        )}
                      </div>
                      <span className="font-medium truncate flex-shrink-0 w-24 sm:w-auto">{match.team1_name}</span>
                      {editingScoreMatchId === match.id ? (
                          <div className="flex items-center space-x-1 mx-2 flex-shrink-0">
                              <input
                                  type="number"
                                  value={score1Input}
                                  onChange={(e) => setScore1Input(e.target.value)}
                                  className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center"
                                  min="0"
                                  disabled={savingScore || isDeletingThisMatch}
                              />
                              <span>-</span>
                              <input
                                  type="number"
                                  value={score2Input}
                                  onChange={(e) => setScore2Input(e.target.value)}
                                  className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center"
                                  min="0"
                                  disabled={savingScore || isDeletingThisMatch}
                              />
                          </div>
                      ) : (
                          <span className={`text-lg font-bold mx-2 flex-shrink-0 ${shouldHighlight ? 'text-yellow-700' : ''}`}>
                              {match.team1_score !== null && match.team2_score !== null
                               ? `${match.team1_score} - ${match.team2_score}`
                               : 'vs'}
                          </span>
                      )}
                      {/* Team 2 Logo/Fallback */}
                       <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 bg-gray-100 rounded overflow-hidden text-gray-400">
                        {logo2Error ? (
                          <Shield className="w-5 h-5" aria-label="Team 2 logo fallback" />
                        ) : (
                          <img
                            src={match.team2_logoUrl}
                            alt={match.team2_name}
                            className="w-full h-full object-contain"
                            onError={() => handleLogoError(match.id, 2)}
                          />
                        )}
                      </div>
                      <span className="font-medium truncate flex-shrink-0 w-24 sm:w-auto">{match.team2_name}</span>
                   </div>

                   {/* Action Buttons */}
                   <div className="flex items-center space-x-2 flex-shrink-0">
                      {editingScoreMatchId === match.id ? (
                          <>
                              <button
                                  onClick={() => handleSaveScore(match.id)}
                                  className="p-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                  disabled={savingScore || isDeletingThisMatch}
                                  title="Save Score"
                              >
                                  <Save className="w-4 h-4" />
                              </button>
                              <button
                                  onClick={handleCancelEditScore}
                                  className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                                  disabled={savingScore || isDeletingThisMatch}
                                  title="Cancel Edit"
                              >
                                  <X className="w-4 h-4" />
                              </button>
                          </>
                      ) : (
                          <button
                              onClick={() => handleEditScoreClick(match)}
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                              disabled={savingScore || loading || !!deletingMatchId}
                              title={match.team1_score !== null ? 'Edit Score' : 'Add Score'}
                          >
                              {match.team1_score !== null ? 'Edit Score' : 'Add Score'}
                          </button>
                      )}
                       <button
                          onClick={() => toggleExpandMatch(match.id)}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                          title={expandedMatchId === match.id ? "Collapse Players" : "Expand Players"}
                          disabled={savingScore || loading || !!deletingMatchId}
                      >
                          {expandedMatchId === match.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                          onClick={() => handleDeleteMatch(match.id, match.team1_name, match.team2_name)}
                          className={`p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-100 disabled:opacity-50 ${isDeletingThisMatch ? 'animate-pulse' : ''}`}
                          disabled={savingScore || loading || !!deletingMatchId}
                          title="Delete Match"
                      >
                          {isDeletingThisMatch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                   </div>
                </div>

                {/* Expanded Player List */}
                {expandedMatchId === match.id && (
                  <div className="mt-3 pt-3 border-t text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                      <div>
                          <strong className="block mb-1">{match.team1_name} Players:</strong>
                          {match.team1_players.length > 0 ? (
                              <ul className="list-disc list-inside">
                                  {match.team1_players.map(p => <li key={p.id}>{p.name}</li>)}
                              </ul>
                          ) : <span className="italic">No players recorded</span>}
                      </div>
                       <div>
                          <strong className="block mb-1">{match.team2_name} Players:</strong>
                          {match.team2_players.length > 0 ? (
                              <ul className="list-disc list-inside">
                                  {match.team2_players.map(p => <li key={p.id}>{p.name}</li>)}
                              </ul>
                          ) : <span className="italic">No players recorded</span>}
                      </div>
                  </div>
                )}
                 <div className="text-right text-xs text-gray-400 mt-1">
                   Played: {formatDateTimeEuropean(match.played_at)} {/* Use the formatting function */}
                 </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MatchHistory;
