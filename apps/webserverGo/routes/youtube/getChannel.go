package youtube

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"

	"jasper/utils"
)

func ChannelInfoHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	channelID := vars["id"]

	data, err := utils.FetchChannelData(channelID)
	if err != nil {
		http.Error(w, "Error fetching data", http.StatusInternalServerError)
		return
	}

    w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(data)
	if err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}
